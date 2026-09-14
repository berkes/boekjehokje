import { createContext, useContext } from "react";
import type { UserContextType } from "./UserContext";

// Create context with initial values
export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

// Custom hook to use the user context
// Prefixed with 'use' per AGENT.md: Hooks: Reusable, typed, prefixed with `use`
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
