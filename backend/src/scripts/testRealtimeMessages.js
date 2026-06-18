require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { io } = require("socket.io-client");
const pool = require("../config/db");

const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
const password = "StrongPass123!";
const auth = (token) => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });
const dateOnly = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}/api${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.message}`);
  return data;
}

async function register(name, email, role) {
  const registration = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role }) });
  return request("/auth/verify-registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact: email, channel: "email", code: registration.devOtp }) });
}

const emit = (socket, event, data) => new Promise((resolve, reject) => socket.emit(event, data, (result) => result.ok ? resolve(result) : reject(new Error(result.message))));

async function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, { auth: { token }, transports: ["websocket"] });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

async function main() {
  const stamp = Date.now();
  const client = await register("Realtime Test Client", `realtime.client.${stamp}@example.com`, "client");
  const freelancer = await register("Realtime Test Freelancer", `realtime.freelancer.${stamp}@example.com`, "freelancer");
  let clientSocket;
  let freelancerSocket;
  let uploadedProposal;
  try {
    const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const project = await request("/projects", { method: "POST", headers: auth(client.token), body: JSON.stringify({ title: `Realtime chat ${stamp}`, description: "Realtime messaging integration project.", budget: 1000, deadline: future, requirements: ["Client and freelancer can exchange persisted realtime messages."] }) });
    const proposal = { coverLetter: "Realtime test proposal.", proposedBudget: "1000", estimatedDeliveryDate: future };
    const proposalForm = new FormData();
    Object.entries(proposal).forEach(([key, value]) => proposalForm.append(key, value));
    proposalForm.append("coverLetterFile", new Blob(["Realtime proposal attachment."], { type: "text/plain" }), "proposal.txt");
    await request(`/projects/${project.projectId}/apply`, { method: "POST", headers: { Authorization: `Bearer ${freelancer.token}` }, body: proposalForm });
    const duplicate = await fetch(`${baseUrl}/api/projects/${project.projectId}/apply`, { method: "POST", headers: auth(freelancer.token), body: JSON.stringify(proposal) });
    if (duplicate.status !== 409) throw new Error("Duplicate application assertion failed.");
    const payment = await request(`/projects/${project.projectId}/escrow`, { method: "POST", headers: auth(client.token), body: JSON.stringify({ provider: "dev_gateway" }) });
    await request("/payments/development/confirm", { method: "POST", headers: auth(client.token), body: JSON.stringify({ providerSessionId: payment.escrow.provider_session_id, reference: payment.escrow.transaction_reference }) });
    const applications = await request(`/projects/${project.projectId}/applications`, { headers: auth(client.token) });
    uploadedProposal = applications.applications[0].attachment_url;
    if (dateOnly(applications.applications[0].estimated_delivery_date) !== future || !uploadedProposal?.startsWith("/uploads/proposals/")) throw new Error("Proposal metadata assertion failed.");
    await request(`/projects/${project.projectId}/applications/${applications.applications[0].id}/hire`, { method: "PATCH", headers: auth(client.token) });
    const clientConversations = await request("/messages", { headers: auth(client.token) });
    const conversation = clientConversations.conversations[0];
    clientSocket = await connect(client.token);
    freelancerSocket = await connect(freelancer.token);
    await emit(clientSocket, "conversation:join", { conversationId: conversation.id });
    await emit(freelancerSocket, "conversation:join", { conversationId: conversation.id });
    const received = new Promise((resolve) => freelancerSocket.once("message:new", resolve));
    await emit(clientSocket, "message:send", { conversationId: conversation.id, message: "Realtime hello" });
    const message = await received;
    await emit(freelancerSocket, "message:read", { conversationId: conversation.id });
    const history = await request(`/messages/${conversation.id}`, { headers: auth(client.token) });
    const stored = history.messages.find((item) => item.id === message.id);
    console.log(JSON.stringify({ conversationId: conversation.id, message: stored.message, seen: Boolean(stored.read_at) }));
    if (stored.message !== "Realtime hello" || !stored.read_at) throw new Error("Realtime message assertion failed.");
  } finally {
    clientSocket?.disconnect();
    freelancerSocket?.disconnect();
    await pool.query(`DELETE FROM users WHERE id IN (?, ?)`, [client.user.id, freelancer.user.id]);
    if (uploadedProposal) await fs.rm(path.join(__dirname, "../..", uploadedProposal.replace(/^\/uploads\//, "uploads/")), { force: true });
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
