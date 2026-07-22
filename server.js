import express from "express";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import { initSocket } from "./utils/socket.js";
import { mlClient } from "./services/mlClient.js";

import paymentRoutes from "./routes/paymentRoutes.js";
import fraudRoutes from "./routes/fraudRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import userPaymentHistoryRoutes from "./routes/userPaymentHistoryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js"; 

dotenv.config({ path: "./.env" });

const app = express();
const httpServer = createServer(app);

// Trust proxy (important if deployed behind a proxy)
app.set("trust proxy", true);

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(
    express.urlencoded({
        limit: "50mb",
        extended: true,
    })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  validate: { trustProxy: false },
});

app.use(limiter);

// Health Check
app.get("/", (req, res) => {
    res.send("Backend is running...");
});

// Routes -  admin routes  register
app.use("/api/fraud", fraudRoutes);

app.use("/api/otp", otpRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/transactions", transactionRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/refunds", refundRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/users", userRoutes);
app.use("/api/user-payment-history", userPaymentHistoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes); 

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    initSocket(httpServer);
    
    httpServer.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      await mlClient.verifyConnection();
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();