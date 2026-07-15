// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.JWT_SECRET;
// const JWT_EXPIRY = process.env.JWT_EXPIRY || "1d";
// const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET;

// export const generateToken = (userId, role) => {
//   return jwt.sign({ id: userId, role: role }, JWT_SECRET, {
//     expiresIn: JWT_EXPIRY,
//   });
// };

// export const verifyToken = (token) => {
//   return jwt.verify(token, JWT_SECRET);
// };

// export const generateResetToken = (userId) => {
//   return jwt.sign({ id: userId }, JWT_RESET_SECRET, {
//     expiresIn: "15m",
//   });
// };

// export const verifyResetToken = (token) => {
//   return jwt.verify(token, JWT_RESET_SECRET);
// };

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