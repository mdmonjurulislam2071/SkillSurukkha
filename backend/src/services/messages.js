const pool = require("../config/db");
const notify = require("./notifications");

const messageFields = `m.id, m.conversation_id, m.project_id, p.title AS project_title, m.sender_id, u.name AS sender_name, m.message, m.attachment_url, m.read_at, m.created_at, m.edited_at, m.deleted_at, m.reactions`;
const parseMessage = (message) => {
  if (!message) return message;
  if (typeof message.reactions === "string") message.reactions = JSON.parse(message.reactions || "{}");
  message.reactions = message.reactions || {};
  return message;
};
const fetchMessage = async (messageId) => {
  const [rows] = await pool.query(`SELECT ${messageFields} FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN projects p ON p.id = m.project_id WHERE m.id = ?`, [messageId]);
  return parseMessage(rows[0]);
};

async function ensureConversation(projectId, connection = pool) {
  const [projects] = await connection.query(
    `SELECT p.id, p.client_id, a.id AS application_id, a.freelancer_id
     FROM projects p
     JOIN applications a ON a.project_id = p.id AND a.status = 'hired'
     WHERE p.id = ?`,
    [projectId]
  );
  const project = projects[0];
  if (!project) return null;
  await connection.query(
    `INSERT INTO conversations (project_id, application_id, client_id, freelancer_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE project_id = COALESCE(project_id, VALUES(project_id)), application_id = COALESCE(application_id, VALUES(application_id)), updated_at = NOW()`,
    [project.id, project.application_id, project.client_id, project.freelancer_id]
  );
  const [rows] = await connection.query(`SELECT * FROM conversations WHERE client_id = ? AND freelancer_id = ?`, [project.client_id, project.freelancer_id]);
  return rows[0];
}

async function ensureApplicationConversation(applicationId, userId, connection = pool) {
  const [applications] = await connection.query(
    `SELECT a.id AS application_id, a.project_id, a.freelancer_id, p.client_id
     FROM applications a
     JOIN projects p ON p.id = a.project_id
     WHERE a.id = ? AND ? IN (p.client_id, a.freelancer_id)`,
    [applicationId, userId]
  );
  const application = applications[0];
  if (!application) return null;
  await connection.query(
    `INSERT INTO conversations (project_id, application_id, client_id, freelancer_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE project_id = COALESCE(project_id, VALUES(project_id)), application_id = COALESCE(application_id, VALUES(application_id)), updated_at = NOW()`,
    [application.project_id, application.application_id, application.client_id, application.freelancer_id]
  );
  const [rows] = await connection.query(`SELECT * FROM conversations WHERE client_id = ? AND freelancer_id = ?`, [application.client_id, application.freelancer_id]);
  return rows[0];
}

async function getConversationForUser(conversationId, userId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT c.*, COALESCE(projects.project_titles, p.title) AS title, client.name AS client_name, freelancer.name AS freelancer_name
     FROM conversations c
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN (
       SELECT p.client_id, a.freelancer_id, GROUP_CONCAT(DISTINCT p.title ORDER BY p.created_at DESC SEPARATOR ' | ') AS project_titles
       FROM projects p
       JOIN applications a ON a.project_id = p.id
       GROUP BY p.client_id, a.freelancer_id
     ) projects ON projects.client_id = c.client_id AND projects.freelancer_id = c.freelancer_id
     JOIN users client ON client.id = c.client_id
     JOIN users freelancer ON freelancer.id = c.freelancer_id
     WHERE c.id = ? AND ? IN (c.client_id, c.freelancer_id)`,
    [conversationId, userId]
  );
  return rows[0];
}

async function listConversations(userId) {
  const [projects] = await pool.query(
    `SELECT p.id
     FROM projects p
     JOIN applications a ON a.project_id = p.id AND a.status = 'hired'
     WHERE ? IN (p.client_id, a.freelancer_id)`,
    [userId]
  );
  await Promise.all(projects.map((project) => ensureConversation(project.id)));
  const [rows] = await pool.query(
    `SELECT c.id, c.project_id, c.application_id, c.client_id, c.freelancer_id, COALESCE(projects.project_titles, p.title) AS title,
            IF(c.client_id = ?, freelancer.name, client.name) AS other_user_name,
            CASE WHEN latest.id IS NOT NULL AND latest.message = '' AND latest.attachment_url IS NOT NULL THEN 'Attachment' ELSE latest.message END AS last_message,
            latest.created_at AS last_message_at,
            COUNT(unread.id) AS unread_count
     FROM conversations c
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN (
       SELECT p.client_id, a.freelancer_id, GROUP_CONCAT(DISTINCT p.title ORDER BY p.created_at DESC SEPARATOR ' | ') AS project_titles
       FROM projects p
       JOIN applications a ON a.project_id = p.id
       GROUP BY p.client_id, a.freelancer_id
     ) projects ON projects.client_id = c.client_id AND projects.freelancer_id = c.freelancer_id
     JOIN users client ON client.id = c.client_id
     JOIN users freelancer ON freelancer.id = c.freelancer_id
     LEFT JOIN messages latest ON latest.id = (
       SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1
     )
     LEFT JOIN messages unread ON unread.conversation_id = c.id AND unread.sender_id <> ? AND unread.read_at IS NULL
     WHERE ? IN (c.client_id, c.freelancer_id)
     GROUP BY c.id, c.project_id, c.application_id, c.client_id, c.freelancer_id, projects.project_titles, p.title, freelancer.name, client.name, latest.id, latest.message, latest.attachment_url, latest.created_at
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC`,
    [userId, userId, userId]
  );
  return rows;
}

async function listMessages(conversationId, userId) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) return null;
  const [messages] = await pool.query(
    `SELECT ${messageFields}
     FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN projects p ON p.id = m.project_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC, m.id ASC
     LIMIT 500`,
    [conversationId]
  );
  return { conversation, messages: messages.map(parseMessage) };
}

async function createMessage(conversationId, senderId, message, attachmentUrl = null) {
  const conversation = await getConversationForUser(conversationId, senderId);
  if (!conversation) return null;
  const text = message?.trim();
  if (!text && !attachmentUrl?.trim()) throw Object.assign(new Error("Write a message or attach a file URL."), { status: 400 });
  const [result] = await pool.query(
    `INSERT INTO messages (conversation_id, project_id, sender_id, message, attachment_url) VALUES (?, ?, ?, ?, ?)`,
    [conversationId, conversation.project_id || null, senderId, text || "", attachmentUrl?.trim() || null]
  );
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  const [rows] = await pool.query(
    `SELECT ${messageFields} FROM messages m JOIN users u ON u.id = m.sender_id LEFT JOIN projects p ON p.id = m.project_id WHERE m.id = ?`,
    [result.insertId]
  );
  const recipientId = Number(conversation.client_id) === Number(senderId) ? conversation.freelancer_id : conversation.client_id;
  const senderName = Number(conversation.client_id) === Number(senderId) ? conversation.client_name : conversation.freelancer_name;
  const notification = await notify(
    pool,
    recipientId,
    "message_received",
    `New message from ${senderName}`,
    text || "Sent an attachment.",
    { conversationId: Number(conversationId), route: "messages", routeData: { conversationId: Number(conversationId) } }
  );
  return { conversation, message: parseMessage(rows[0]), notification, notificationRecipientId: recipientId };
}

async function updateMessage(conversationId, messageId, userId, message) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) return null;
  const text = message?.trim();
  if (!text) throw Object.assign(new Error("Message cannot be empty."), { status: 400 });
  const [result] = await pool.query(`UPDATE messages SET message = ?, edited_at = NOW() WHERE id = ? AND conversation_id = ? AND sender_id = ? AND deleted_at IS NULL`, [text, messageId, conversationId, userId]);
  if (!result.affectedRows) throw Object.assign(new Error("Message not found or cannot be edited."), { status: 404 });
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  return { conversation, message: await fetchMessage(messageId) };
}

async function deleteMessage(conversationId, messageId, userId) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) return null;
  const [result] = await pool.query(`UPDATE messages SET message = '', attachment_url = NULL, deleted_at = NOW() WHERE id = ? AND conversation_id = ? AND sender_id = ? AND deleted_at IS NULL`, [messageId, conversationId, userId]);
  if (!result.affectedRows) throw Object.assign(new Error("Message not found or cannot be unsent."), { status: 404 });
  await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);
  return { conversation, message: await fetchMessage(messageId) };
}

async function reactToMessage(conversationId, messageId, userId, reaction) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) return null;
  const current = await fetchMessage(messageId);
  if (!current || Number(current.conversation_id) !== Number(conversationId) || current.deleted_at) throw Object.assign(new Error("Message not found."), { status: 404 });
  const allowed = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const reactions = current.reactions || {};
  for (const key of Object.keys(reactions)) reactions[key] = (reactions[key] || []).filter((id) => Number(id) !== Number(userId));
  if (reaction) {
    if (!allowed.includes(reaction)) throw Object.assign(new Error("Unsupported reaction."), { status: 400 });
    reactions[reaction] = [...(reactions[reaction] || []), Number(userId)];
  }
  for (const key of Object.keys(reactions)) if (!reactions[key].length) delete reactions[key];
  await pool.query(`UPDATE messages SET reactions = ? WHERE id = ? AND conversation_id = ?`, [JSON.stringify(reactions), messageId, conversationId]);
  return { conversation, message: await fetchMessage(messageId) };
}

async function markRead(conversationId, userId) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) return null;
  await pool.query(`UPDATE messages SET read_at = COALESCE(read_at, NOW()) WHERE conversation_id = ? AND sender_id <> ?`, [conversationId, userId]);
  return conversation;
}

module.exports = { createMessage, deleteMessage, ensureApplicationConversation, ensureConversation, getConversationForUser, listConversations, listMessages, markRead, reactToMessage, updateMessage };
