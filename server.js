require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const http       = require("http");
const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");
const connectDB  = require("./config/db");
const Message      = require("./models/Message");
const Conversation = require("./models/Conversation");

connectDB();

const app    = express();
const server = http.createServer(app);
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));
app.options("/{*path}", cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

app.use("/api/auth",         require("./routes/auth"));
app.use("/api/user",         require("./routes/user"));
app.use("/api/interests",    require("./routes/interest"));
app.use("/api/notification", require("./routes/notification"));
app.use("/api/messages",     require("./routes/message"));  // ✅ new

app.get("/", (req, res) => res.send("Matrimony API Running"));

// ── Socket.IO ─────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId → socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    const decoded  = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId  = decoded.user.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  io.emit("user_online", { userId, online: true });

  // Join all user's conversation rooms
  socket.on("join_conversations", (convIds) => {
    convIds.forEach((id) => socket.join(id));
  });

  // Send message via socket
  socket.on("send_message", async ({ conversationId, text }) => {
    try {
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.participants.includes(userId)) return;

      const msg = await Message.create({
        conversationId,
        sender: userId,
        text:   text.trim(),
        readBy: [userId],
      });

      conv.lastMessage  = msg._id;
      conv.lastActivity = new Date();
      await conv.save();

      const populated = await msg.populate("sender", "username images");

      // Emit to everyone in the conversation room (including sender)
      io.to(conversationId).emit("new_message", populated);

      // Update conversation list for all participants
      conv.participants.forEach((pId) => {
        const sid = onlineUsers.get(pId.toString());
        if (sid) io.to(sid).emit("conversation_updated", {
          conversationId,
          lastMessage: populated,
          lastActivity: conv.lastActivity,
        });
      });
    } catch (err) {
      console.error("Socket send error:", err);
    }
  });

  // Typing indicator
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(conversationId).emit("user_typing", { userId, isTyping });
  });

  // Mark read
  socket.on("mark_read", async ({ conversationId }) => {
    await Message.updateMany(
      { conversationId, sender: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    socket.to(conversationId).emit("messages_read", { conversationId, userId });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("user_online", { userId, online: false });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));