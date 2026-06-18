const express = require("express");
const pool = require("../config/db");
const { authenticate, allowRoles } = require("../middleware/auth");
const { enabledProviders, executeBkashPayment, frontendUrl, verifyWebhookSignature } = require("../services/paymentProviders");
const router = express.Router();
const withdrawalMethods = new Set(["bank", "bkash", "nagad", "rocket", "paypal", "wise"]);

async function walletSummary(userId) {
  const [[earnings]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE user_id = ? AND type IN ('ai_release','final_release','adjustment')`, [userId]);
  const [[reserved]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE freelancer_id = ? AND status IN ('pending','processing','paid')`, [userId]);
  return {
    earned: Number(earnings.total || 0),
    withdrawnOrReserved: Number(reserved.total || 0),
    available: Math.max(0, Number(earnings.total || 0) - Number(reserved.total || 0)),
  };
}

router.get("/providers", authenticate, allowRoles("freelancer", "client", "admin"), (_, res) => {
  res.json({ providers: enabledProviders() });
});

router.post("/webhooks/:provider", async (req, res, next) => {
  try {
    const rawBody = JSON.stringify(req.body || {});
    if (!verifyWebhookSignature(req.params.provider, rawBody, req.headers["x-payment-signature"])) return res.status(401).json({ message: "Invalid payment signature." });
    const { providerSessionId, status, transactionReference, amount } = req.body;
    if (!providerSessionId || !["paid", "succeeded", "funded"].includes(String(status))) return res.status(400).json({ message: "Unsupported payment event." });
    const [result] = await pool.query(
      `UPDATE escrows
       SET status = 'funded', funded_at = NOW(), transaction_reference = COALESCE(?, transaction_reference)
       WHERE payment_provider = ? AND provider_session_id = ? AND status = 'pending' AND (? IS NULL OR amount = ?)`,
      [transactionReference || null, req.params.provider, providerSessionId, amount || null, amount || null]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Pending escrow not found." });
    res.json({ received: true });
  } catch (error) { next(error); }
});

router.get("/bkash/callback", async (req, res, next) => {
  try {
    const { paymentID, status } = req.query;
    const redirectUrl = frontendUrl();
    if (!paymentID) return res.redirect(`${redirectUrl}?payment=bkash-missing`);
    if (status && String(status).toLowerCase() !== "success") return res.redirect(`${redirectUrl}?payment=bkash-${encodeURIComponent(status)}`);
    const execution = await executeBkashPayment(paymentID);
    const trxID = execution.trxID || execution.transactionStatus || paymentID;
    const [result] = await pool.query(
      `UPDATE escrows SET status = 'funded', funded_at = NOW(), transaction_reference = ? WHERE payment_provider = 'bkash' AND provider_session_id = ? AND status = 'pending'`,
      [trxID, paymentID]
    );
    if (!result.affectedRows) return res.redirect(`${redirectUrl}?payment=bkash-not-found`);
    res.redirect(`${redirectUrl}?payment=bkash-success`);
  } catch (error) { next(error); }
});

router.post("/development/confirm", authenticate, allowRoles("client"), async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.PAYMENT_ENABLE_DEVELOPMENT_GATEWAY !== "true") return res.status(403).json({ message: "Development payment is disabled in production." });
    const { providerSessionId, reference } = req.body;
    if (!providerSessionId || !reference) return res.status(400).json({ message: "Payment session and reference are required." });
    const transactionReference = `DEV-${Date.now()}`;
    const [result] = await pool.query(
      `UPDATE escrows
       SET status = 'funded', funded_at = NOW(), transaction_reference = ?
       WHERE client_id = ? AND payment_provider = 'dev_gateway' AND provider_session_id = ? AND transaction_reference = ? AND status = 'pending'`,
      [transactionReference, req.user.id, providerSessionId, reference]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Pending development escrow not found." });
    res.json({ message: "Development escrow funded.", transactionReference });
  } catch (error) { next(error); }
});

router.patch("/escrows/:id/confirm", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const reference = req.body.transactionReference?.trim();
    if (!reference) return res.status(400).json({ message: "Transaction reference is required." });
    const [result] = await pool.query(`UPDATE escrows SET status = 'funded', transaction_reference = ?, funded_at = NOW() WHERE id = ? AND status = 'pending'`, [reference, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pending escrow not found." });
    res.json({ message: "Escrow confirmed." });
  } catch (error) { next(error); }
});

router.get("/mine", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const ownerColumn = req.user.role === "client" ? "e.client_id" : "e.freelancer_id";
    const [transactions] = await pool.query(
      `SELECT e.id, e.project_id, e.amount, e.released_amount, e.refunded_amount, e.payment_method, e.payment_provider, e.transaction_reference, e.status, e.funded_at, e.released_at, p.title
       FROM escrows e JOIN projects p ON p.id = e.project_id
       WHERE ${ownerColumn} = ? ORDER BY e.funded_at DESC, e.id DESC`,
      [req.user.id]
    );
    const summary = transactions.reduce(
      (totals, transaction) => {
        totals.total += Number(transaction.amount);
        totals[transaction.status] += Number(transaction.amount);
        return totals;
      },
      { total: 0, pending: 0, funded: 0, partially_released: 0, released: 0, refunded: 0, failed: 0 }
    );
    summary.inEscrow = transactions.reduce((total, transaction) => total + Math.max(0, Number(transaction.amount) - Number(transaction.released_amount || 0) - Number(transaction.refunded_amount || 0)), 0);
    const wallet = req.user.role === "freelancer" ? await walletSummary(req.user.id) : null;
    const [withdrawals] = req.user.role === "freelancer"
      ? await pool.query(`SELECT id, amount, method, status, transaction_reference, admin_note, processed_at, created_at FROM withdrawal_requests WHERE freelancer_id = ? ORDER BY created_at DESC, id DESC`, [req.user.id])
      : [[]];
    res.json({ summary, transactions, wallet, withdrawals });
  } catch (error) { next(error); }
});

router.post("/withdrawals", authenticate, allowRoles("freelancer"), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const amount = Number(req.body.amount);
    const method = String(req.body.method || "").toLowerCase();
    const accountName = req.body.accountName?.trim();
    const accountNumber = req.body.accountNumber?.trim();
    const bankName = req.body.bankName?.trim() || null;
    if (!Number.isFinite(amount) || amount <= 0 || !withdrawalMethods.has(method) || !accountName || !accountNumber) {
      throw Object.assign(new Error("Provide a positive amount, payout method, account name and account number."), { status: 400 });
    }
    const [[earnings]] = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE user_id = ? AND type IN ('ai_release','final_release','adjustment')`, [req.user.id]);
    const [[reserved]] = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE freelancer_id = ? AND status IN ('pending','processing','paid')`, [req.user.id]);
    const available = Number(earnings.total || 0) - Number(reserved.total || 0);
    if (amount > available) throw Object.assign(new Error(`Your available wallet balance is ${available.toFixed(2)}.`), { status: 409 });
    const details = { accountName, accountNumber, bankName };
    const [result] = await connection.query(`INSERT INTO withdrawal_requests (freelancer_id, amount, method, account_details) VALUES (?, ?, ?, ?)`, [req.user.id, amount, method, JSON.stringify(details)]);
    await connection.commit();
    res.status(201).json({ message: "Withdrawal request submitted for payout processing.", withdrawalId: result.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
});

module.exports = router;
