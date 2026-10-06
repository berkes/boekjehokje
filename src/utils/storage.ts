/**
 * LocalStorage utility functions for user preferences
 * Follows AGENT.md: Use localStorage only for user preferences, not business data
 */

// Type definitions for user preferences
export interface UserPreferences {
  name: string;
  email: string;
  contactInfo?: string;
  language?: string;
  theme?: "light" | "dark" | "system";
  [key: string]: string | undefined;
}

export interface AuthenticationTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export interface AuthenticationState {
  tokens: AuthenticationTokens | null;
  profile: {
    name: string;
    email: string;
    picture?: string;
  } | null;
}

// Storage keys constants
export const STORAGE_KEYS = {
  USER_PREFERENCES: "boekjehokje_user_prefs",
  AUTHENTICATION: "boekjehokje_authentication",
} as const;

/**
 * Save user preferences to localStorage
 * @param preferences - User preferences object
 */
export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    const serialized = JSON.stringify(preferences);
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, serialized);
  } catch (error) {
    console.error("Failed to save user preferences:", error);
    throw new Error("Could not save user preferences", { cause: error });
  }
}

/**
 * Retrieve user preferences from localStorage
 * @returns UserPreferences object or null if not found
 */
export function getUserPreferences(): UserPreferences | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized) as UserPreferences;
  } catch (error) {
    console.error("Failed to retrieve user preferences:", error);
    return null;
  }
}

/**
 * Update specific user preference fields
 * @param updates - Partial user preferences to update
 */
export function updateUserPreferences(updates: Partial<UserPreferences>): void {
  const current = getUserPreferences() || { name: "", email: "" };
  const updated = { ...current, ...updates };
  saveUserPreferences(updated);
}

/**
 * Clear user preferences from localStorage
 */
export function clearUserPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
  } catch (error) {
    console.error("Failed to clear user preferences:", error);
    throw new Error("Could not clear user preferences", { cause: error });
  }
}

/**
 * Save authentication state (tokens + profile) securely in localStorage
 * Note: localStorage is not truly secure but sufficient for non-sensitive data
 * @param state - Complete authentication state object
 */
export function saveAuthenticationState(state: AuthenticationState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEYS.AUTHENTICATION, serialized);
  } catch (error) {
    console.error("Failed to save authentication state:", error);
    throw new Error("Could not save authentication state", { cause: error });
  }
}

/**
 * Retrieve authentication state from localStorage
 * @returns AuthenticationState object or null if not found or expired
 */
export function getAuthenticationState(): AuthenticationState {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.AUTHENTICATION);
    if (!serialized) {
      return { tokens: null, profile: null };
    }
    const state = JSON.parse(serialized) as AuthenticationState;

    // Check if token is expired
    if (
      state.tokens && state.tokens.expiresAt &&
      state.tokens.expiresAt < Date.now()
    ) {
      clearAuthenticationState();
      return { tokens: null, profile: null };
    }

    return state;
  } catch (error) {
    console.error("Failed to retrieve authentication state:", error);
    return { tokens: null, profile: null };
  }
}

/**
 * Clear authentication state from localStorage
 */
export function clearAuthenticationState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTHENTICATION);
  } catch (error) {
    console.error("Failed to clear authentication state:", error);
    throw new Error("Could not clear authentication state", { cause: error });
  }
}

/**
 * Clear all user data from localStorage
 */
export function clearAllUserData(): void {
  clearAuthenticationState();
  clearUserPreferences();
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export function isAuthenticated(): boolean {
  const tokens = getAuthenticationState().tokens;
  return tokens !== null;
}
