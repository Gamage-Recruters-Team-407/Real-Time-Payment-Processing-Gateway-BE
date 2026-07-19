import express from "express";
import { createServer } from "http";
import cors from "cors";
import { initSocket } from "./utils/socket.js";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
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

dotenv.config({ path: "./.env" });

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", true);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit for live polling
  validate: { trustProxy: false },
});
app.use(limiter);

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// Routes
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

const PORT = process.env.PORT || 5000;

import { mlClient } from "./services/mlClient.js";

const startServer = async () => {
  try {
    await connectDB();
    
    initSocket(httpServer);
    
    httpServer.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      // Ping the ML microservice on startup to show success message
      await mlClient.verifyConnection();
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
