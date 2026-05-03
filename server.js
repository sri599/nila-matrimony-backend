require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const connectDB = require("./config/db");

connectDB();

const app = express();

// ── Middleware ─────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/user",         require("./routes/user"));
app.use("/api/interests",    require("./routes/interest"));
app.use("/api/notification", require("./routes/notification"));
app.use("/api/messages",     require("./routes/message"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/plan", require("./routes/plan"));
app.use("/api/support", require("./routes/support"));

app.get("/", (req, res) => res.send("API Running"));

// ── Start Server ───────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));