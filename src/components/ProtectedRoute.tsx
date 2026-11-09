import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession.tsx";

/**
 * Protected route component that redirects to home if not authenticated
 */
export function ProtectedRoute(
  { children }: { children: React.JSX.Element },
): React.JSX.Element {
  const { isLoggedIn, isLoading } = useSession();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}
