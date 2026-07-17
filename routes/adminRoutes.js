import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext"; // Dev 13

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  // While auth state is still resolving (e.g. checking token on refresh)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking access...</p>
      </div>
    );
  }

  // Not logged in at all -> send to login, remember where they wanted to go
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not an administrator -> block access
  const allowedRoles = ["System Administrator", "Admin", "admin"];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Verified administrator -> render the protected admin page
  return children;
}