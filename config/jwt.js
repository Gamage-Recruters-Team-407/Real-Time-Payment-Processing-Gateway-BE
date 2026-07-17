import jwt from "jsonwebtoken";

export const generateToken = (userId, role, customExpiry) => {
  console.log("JWT_SECRET:", process.env.JWT_SECRET);

  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    {
      expiresIn: customExpiry || process.env.JWT_EXPIRY || "1d",
    }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const generateResetToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_RESET_SECRET,
    {
      expiresIn: "15m",
    }
  );
};

export const verifyResetToken = (token) => {
  return jwt.verify(token, process.env.JWT_RESET_SECRET);
};