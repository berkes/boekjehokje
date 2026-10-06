import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/useUser.ts";

/**
 * Protected route component that redirects to home if not authenticated
 */
export function ProtectedRoute(
  { children }: { children: React.JSX.Element },
): React.JSX.Element {
  const { isLoggedIn, isLoading } = useUser();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}
