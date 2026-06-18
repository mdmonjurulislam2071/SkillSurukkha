require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const baseUrl = `http://localhost:${process.env.PORT || 5000}/api`;
const password = "StrongPass123!";

async function request(url, options = {}, expectedStatus = null) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const data = await response.json().catch(() => ({}));
  if (expectedStatus !== null) {
    if (response.status !== expectedStatus) throw new Error(`Expected ${expectedStatus}, received ${response.status}: ${data.message}`);
    return data;
  }
  if (!response.ok) throw new Error(`${response.status}: ${data.message}`);
  return data;
}

async function registerFreelancer(stamp) {
  const email = `withdrawal.freelancer.${stamp}@example.com`;
  const registration = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Withdrawal Test Freelancer", email, password, role: "freelancer" }) });
  return request("/auth/verify-registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact: email, channel: "email", code: registration.devOtp }) });
}

async function main() {
  const stamp = Date.now();
  const freelancer = await registerFreelancer(stamp);
  const adminEmail = `withdrawal.admin.${stamp}@example.com`;
  let adminId;
  try {
    await pool.query(`INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, 'adjustment', 1000, 'Disposable withdrawal test credit')`, [freelancer.user.id]);
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${freelancer.token}` };
    const withdrawal = await request("/payments/withdrawals", { method: "POST", headers, body: JSON.stringify({ amount: 600, method: "bkash", accountName: "Withdrawal Test", accountNumber: "01700000000" }) });
    await request("/payments/withdrawals", { method: "POST", headers, body: JSON.stringify({ amount: 500, method: "bkash", accountName: "Withdrawal Test", accountNumber: "01700000000" }) }, 409);

    const [adminResult] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at) VALUES ('Withdrawal Test Admin', ?, ?, 'admin', NOW())`,
      [adminEmail, await bcrypt.hash(password, 4)]
    );
    adminId = adminResult.insertId;
    const admin = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact: adminEmail, password }) });
    await request(`/admin/withdrawals/${withdrawal.withdrawalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ status: "paid", transactionReference: `PAYOUT-${stamp}` }),
    });
    const payments = await request("/payments/mine", { headers });
    const paid = payments.withdrawals.find((item) => Number(item.id) === Number(withdrawal.withdrawalId));
    if (Number(payments.wallet.available) !== 400 || paid?.status !== "paid") throw new Error("Withdrawal balance or paid-status assertion failed.");
    console.log(JSON.stringify({ earned: payments.wallet.earned, paid: Number(paid.amount), available: payments.wallet.available, reference: paid.transaction_reference }));
  } finally {
    await pool.query(`DELETE FROM users WHERE id IN (?, ?)`, [freelancer.user.id, adminId || 0]);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
