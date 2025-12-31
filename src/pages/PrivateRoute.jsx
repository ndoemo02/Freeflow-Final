import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}


