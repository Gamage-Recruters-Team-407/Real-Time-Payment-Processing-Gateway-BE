import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";

import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
 
dotenv.config({ path: "./.env" });
import transactionRoutes from "./routes/transactionRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";


dotenv.config({ path: "./.env" });

const app = express();


// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// Health Check
app.get("/", (req, res) => {
  res.send("Backend is running...");
});


// OTP Routes
app.use("/api/otp", otpRoutes);


// Authentication Routes
app.use("/api/auth", authRoutes);


// Transaction Routes
app.use("/api/transactions", transactionRoutes);


// Payment Routes
app.use("/api/payments", paymentRoutes);

app.use("/api/auth" , authRoutes);
// Refund routes
app.use("/api/refunds", refundRoutes);

// Settings routes
app.use("/api/settings", settingsRoutes);



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
// restart nodemon to load updated env configs