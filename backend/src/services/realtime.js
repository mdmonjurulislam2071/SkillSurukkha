const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { createMessage, getConversationForUser, markRead } = require("./messages");

function configureRealtime(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await pool.query(`SELECT id, role, status FROM users WHERE id = ? LIMIT 1`, [user.id]);
      if (!rows.length || rows[0].status !== "active") return next(new Error("This session is no longer active."));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error("Invalid or expired session."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("conversation:join", async ({ conversationId }, acknowledge = () => {}) => {
      try {
        const conversation = await getConversationForUser(conversationId, socket.user.id);
        if (!conversation) return acknowledge({ ok: false, message: "Conversation not found." });
        socket.join(`conversation:${conversationId}`);
        acknowledge({ ok: true });
      } catch (error) { acknowledge({ ok: false, message: error.message }); }
    });

    socket.on("message:send", async ({ conversationId, message, attachmentUrl }, acknowledge = () => {}) => {
      try {
        const result = await createMessage(conversationId, socket.user.id, message, attachmentUrl);
        if (!result) return acknowledge({ ok: false, message: "Conversation not found." });
        io.to(`conversation:${conversationId}`)
          .to(`user:${result.conversation.client_id}`)
          .to(`user:${result.conversation.freelancer_id}`)
          .emit("message:new", result.message);
        io.to(`user:${result.conversation.client_id}`).to(`user:${result.conversation.freelancer_id}`).emit("conversation:updated", { conversationId: Number(conversationId) });
        if (result.notification) io.to(`user:${result.notificationRecipientId}`).emit("notification:new", result.notification);
        acknowledge({ ok: true, message: result.message });
      } catch (error) { acknowledge({ ok: false, message: error.message }); }
    });

    socket.on("message:read", async ({ conversationId }, acknowledge = () => {}) => {
      try {
        const conversation = await markRead(conversationId, socket.user.id);
        if (!conversation) return acknowledge({ ok: false, message: "Conversation not found." });
        io.to(`conversation:${conversationId}`)
          .to(`user:${conversation.client_id}`)
          .to(`user:${conversation.freelancer_id}`)
          .emit("message:read", { conversationId: Number(conversationId), readerId: socket.user.id });
        acknowledge({ ok: true });
      } catch (error) { acknowledge({ ok: false, message: error.message }); }
    });

    socket.on("typing", async ({ conversationId, active }) => {
      const conversation = await getConversationForUser(conversationId, socket.user.id);
      if (conversation) socket.to(`conversation:${conversationId}`).emit("typing", { conversationId: Number(conversationId), userId: socket.user.id, active: Boolean(active) });
    });
  });
}

module.exports = configureRealtime;
