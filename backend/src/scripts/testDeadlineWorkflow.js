require("dotenv").config();
const pool = require("../config/db");

const baseUrl = `http://localhost:${process.env.PORT || 5000}/api`;
const password = "StrongPass123!";

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.message}`);
  return data;
}

async function register(name, email, role) {
  const registration = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  return request("/auth/verify-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact: email, channel: "email", code: registration.devOtp }),
  });
}

const auth = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

async function createHiredProject(client, freelancer, title) {
  const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const project = await request("/projects", { method: "POST", headers: auth(client.token), body: JSON.stringify({ title, description: "Deadline workflow integration project.", budget: 1000, deadline: future, requirements: ["The deadline workflow remains operational."] }) });
  await request(`/projects/${project.projectId}/apply`, { method: "POST", headers: auth(freelancer.token), body: JSON.stringify({ coverLetter: "I can complete this project.", proposedBudget: 1000, estimatedDeliveryDate: future }) });
  const payment = await request(`/projects/${project.projectId}/escrow`, { method: "POST", headers: auth(client.token), body: JSON.stringify({ provider: "dev_gateway" }) });
  await request("/payments/development/confirm", { method: "POST", headers: auth(client.token), body: JSON.stringify({ providerSessionId: payment.escrow.provider_session_id, reference: payment.escrow.transaction_reference }) });
  const applications = await request(`/projects/${project.projectId}/applications`, { headers: auth(client.token) });
  await request(`/projects/${project.projectId}/applications/${applications.applications[0].id}/hire`, { method: "PATCH", headers: auth(client.token) });
  await pool.query(`UPDATE projects SET deadline = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id = ?`, [project.projectId]);
  await request("/projects/mine", { headers: auth(client.token) });
  return project.projectId;
}

async function main() {
  const stamp = Date.now();
  const client = await register("Deadline Test Client", `deadline.client.${stamp}@example.com`, "client");
  const freelancer = await register("Deadline Test Freelancer", `deadline.freelancer.${stamp}@example.com`, "freelancer");
  try {
    const extensionProject = await createHiredProject(client, freelancer, `Extension ${stamp}`);
    const extendedDeadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await request(`/projects/${extensionProject}/deadline`, { method: "PATCH", headers: auth(client.token), body: JSON.stringify({ deadline: extendedDeadline, reason: "Mutually agreed extension." }) });

    const refundProject = await createHiredProject(client, freelancer, `Refund ${stamp}`);
    await request(`/projects/${refundProject}/cancel-refund`, { method: "PATCH", headers: auth(client.token) });

    const disputeProject = await createHiredProject(client, freelancer, `Dispute ${stamp}`);
    await request(`/projects/${disputeProject}/disputes`, { method: "POST", headers: auth(freelancer.token), body: JSON.stringify({ reason: "Deadline requires administrator review." }) });

    const [[extension]] = await pool.query(`SELECT status FROM projects WHERE id = ?`, [extensionProject]);
    const [[refund]] = await pool.query(`SELECT p.status, e.status AS escrow_status FROM projects p JOIN escrows e ON e.project_id = p.id WHERE p.id = ?`, [refundProject]);
    const [[dispute]] = await pool.query(`SELECT p.status, d.status AS dispute_status FROM projects p JOIN project_disputes d ON d.project_id = p.id WHERE p.id = ?`, [disputeProject]);
    const result = { extension: extension.status, refund: `${refund.status}/${refund.escrow_status}`, dispute: `${dispute.status}/${dispute.dispute_status}` };
    console.log(JSON.stringify(result));
    if (result.extension !== "in_progress" || result.refund !== "cancelled/refunded" || result.dispute !== "disputed/open") throw new Error("Deadline workflow assertion failed.");
  } finally {
    await pool.query(`DELETE FROM users WHERE id IN (?, ?)`, [client.user.id, freelancer.user.id]);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
