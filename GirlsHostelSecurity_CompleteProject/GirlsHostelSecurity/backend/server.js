require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const eventRoutes = require("./routes/eventRoutes");
const { requireDashboard } = require("./middleware/auth");

const required = ["MONGO_URI", "DEVICE_TOKEN", "DASHBOARD_API_KEY"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PATCH"],
  allowedHeaders: ["Content-Type", "x-device-token", "x-dashboard-key"]
}));
app.use(express.json({ limit: "10kb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false
});
app.use("/api/", apiLimiter);

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ["GET"] }
});
app.set("io", io);

const emailConfigured = Boolean(
  process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.WARDEN_EMAIL
);

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

app.set("sendAlertEmail", async (event) => {
  if (!transporter) return;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.WARDEN_EMAIL,
    subject: "Hostel Security Demo - Gate Sensor Event",
    text: [
      "A simulated gate sensor event was received.",
      `Device: ${event.deviceId}`,
      `Event: ${event.eventType}`,
      `Status: ${event.status}`,
      `Source: ${event.source}`,
      `Time: ${event.createdAt}`,
      "",
      "This is a demonstration event and is not confirmation of an intrusion."
    ].join("\n")
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "girls-hostel-security-demo" });
});

app.use("/api/events", eventRoutes);

// Socket.IO dashboard connections must authenticate with the dashboard key.
io.use((socket, next) => {
  const key = socket.handshake.auth && socket.handshake.auth.dashboardKey;
  if (!process.env.DASHBOARD_API_KEY || key !== process.env.DASHBOARD_API_KEY) {
    return next(new Error("Dashboard authentication failed"));
  }
  next();
});

io.on("connection", (socket) => {
  console.log("Authorized dashboard connected:", socket.id);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});
