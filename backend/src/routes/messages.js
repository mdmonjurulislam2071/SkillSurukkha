const express = require("express");
const fs = require("fs/promises");
const multer = require("multer");
const path = require("path");
const { authenticate, allowRoles } = require("../middleware/auth");
const { createMessage, deleteMessage, ensureApplicationConversation, listConversations, listMessages, markRead, reactToMessage, updateMessage } = require("../services/messages");
const router = express.Router();
const emitMessageUpdate = (req, conversationId, result) => {
  req.app.get("io")
    ?.to(`conversation:${conversationId}`)
    .to(`user:${result.conversation.client_id}`)
    .to(`user:${result.conversation.freelancer_id}`)
    .emit("message:updated", result.message);
  req.app.get("io")?.to(`user:${result.conversation.client_id}`).to(`user:${result.conversation.freelancer_id}`).emit("conversation:updated", { conversationId: Number(conversationId) });
};

const allowedAttachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);
const allowedAttachmentExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip"]);
const safeName = (name) => path.basename(name, path.extname(name)).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "attachment";
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: async (_, __, done) => {
      try {
        const directory = path.join(__dirname, "../../uploads/messages");
        await fs.mkdir(directory, { recursive: true });
        done(null, directory);
      } catch (error) { done(error); }
    },
    filename: (_, file, done) => {
      const extension = path.extname(file.originalname).toLowerCase();
      done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(file.originalname)}${extension}`);
    },
  }),
  limits: { fileSize: Number(process.env.MESSAGE_ATTACHMENT_MAX_MB || 15) * 1024 * 1024 },
  fileFilter: (_, file, done) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedAttachmentTypes.has(file.mimetype) && allowedAttachmentExtensions.has(extension)) return done(null, true);
    const error = new Error("Only images, PDFs, Office documents, text, CSV and ZIP files are allowed.");
    error.status = 400;
    done(error);
  },
});

router.get("/", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    res.json({ conversations: await listConversations(req.user.id) });
  } catch (error) { next(error); }
});

router.post("/applications/:applicationId", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const conversation = await ensureApplicationConversation(req.params.applicationId, req.user.id);
    if (!conversation) return res.status(404).json({ message: "Application not found." });
    res.status(201).json({ conversation });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const result = await listMessages(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ message: "Conversation not found." });
    res.json(result);
  } catch (error) { next(error); }
});

router.post("/:id", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const result = await createMessage(req.params.id, req.user.id, req.body.message, req.body.attachmentUrl);
    if (!result) return res.status(404).json({ message: "Conversation not found." });
    req.app.get("io")
      ?.to(`conversation:${req.params.id}`)
      .to(`user:${result.conversation.client_id}`)
      .to(`user:${result.conversation.freelancer_id}`)
      .emit("message:new", result.message);
    req.app.get("io")?.to(`user:${result.conversation.client_id}`).to(`user:${result.conversation.freelancer_id}`).emit("conversation:updated", { conversationId: Number(req.params.id) });
    if (result.notification) req.app.get("io")?.to(`user:${result.notificationRecipientId}`).emit("notification:new", result.notification);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.post("/:id/attachments", authenticate, allowRoles("freelancer", "client"), attachmentUpload.single("attachment"), async (req, res, next) => {
  try {
    const result = await listMessages(req.params.id, req.user.id);
    if (!result) {
      if (req.file) await fs.rm(req.file.path, { force: true });
      return res.status(404).json({ message: "Conversation not found." });
    }
    if (!req.file) return res.status(400).json({ message: "Choose a file to upload." });
    res.status(201).json({
      attachment: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/messages/${req.file.filename}`,
      },
    });
  } catch (error) { next(error); }
});

router.patch("/:id/messages/:messageId", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const result = await updateMessage(req.params.id, req.params.messageId, req.user.id, req.body.message);
    if (!result) return res.status(404).json({ message: "Conversation not found." });
    emitMessageUpdate(req, req.params.id, result);
    res.json(result);
  } catch (error) { next(error); }
});

router.delete("/:id/messages/:messageId", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const result = await deleteMessage(req.params.id, req.params.messageId, req.user.id);
    if (!result) return res.status(404).json({ message: "Conversation not found." });
    emitMessageUpdate(req, req.params.id, result);
    res.json(result);
  } catch (error) { next(error); }
});

router.post("/:id/messages/:messageId/reactions", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const result = await reactToMessage(req.params.id, req.params.messageId, req.user.id, req.body.reaction || null);
    if (!result) return res.status(404).json({ message: "Conversation not found." });
    emitMessageUpdate(req, req.params.id, result);
    res.json(result);
  } catch (error) { next(error); }
});

router.patch("/:id/read", authenticate, allowRoles("freelancer", "client"), async (req, res, next) => {
  try {
    const conversation = await markRead(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    req.app.get("io")
      ?.to(`conversation:${req.params.id}`)
      .to(`user:${conversation.client_id}`)
      .to(`user:${conversation.freelancer_id}`)
      .emit("message:read", { conversationId: Number(req.params.id), readerId: req.user.id });
    res.json({ message: "Messages marked as read." });
  } catch (error) { next(error); }
});

module.exports = router;
