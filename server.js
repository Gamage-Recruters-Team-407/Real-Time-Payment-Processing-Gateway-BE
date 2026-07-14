import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from './config/db.js';
import paymentRoutes from "./routes/paymentRoutes.js";
import fraudRoutes from './routes/fraudRoutes.js';
import otpRoutes from "./routes/otpRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";

dotenv.config();

const app = express();

// Increase JSON request payload size limit to support base64 image uploads
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use('/api/fraud', fraudRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running...");
});


// OTP routes
app.use("/api/otp", otpRoutes);

// Payment routes
app.use("/api/payments", paymentRoutes);

// Refund routes
app.use("/api/refunds", refundRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1); 
  }
};

startServer();