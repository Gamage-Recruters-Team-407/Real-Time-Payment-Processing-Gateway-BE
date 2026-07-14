module.exports = (req, res, next) => {
  try {
    // authMiddleware should have already attached the decoded user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in to continue.",
      });
    }

    const allowedRoles = ["System Administrator", "Admin", "admin"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required.",
      });
    }

    // User is a verified administrator, continue to the route handler
    next();
  } catch (error) {
    console.error("[adminMiddleware] Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};