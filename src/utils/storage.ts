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

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

// Storage keys constants
export const STORAGE_KEYS = {
  USER_PREFERENCES: "boekjehokje_user_prefs",
  AUTH_TOKENS: "boekjehokje_auth_tokens",
  USER_PROFILE: "boekjehokje_user_profile",
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
 * Clear user profile from localStorage
 */
export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } catch (error) {
    console.error("Failed to clear user profile:", error);
    throw new Error("Could not clear user profile", { cause: error });
  }
}

/**
 * Save authentication tokens securely in localStorage
 * Note: localStorage is not truly secure but sufficient for non-sensitive data
 * @param tokens - Authentication tokens object
 */
export function saveAuthTokens(tokens: AuthTokens): void {
  try {
    const serialized = JSON.stringify(tokens);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, serialized);
  } catch (error) {
    console.error("Failed to save auth tokens:", error);
    throw new Error("Could not save auth tokens", { cause: error });
  }
}

/**
 * Retrieve authentication tokens from localStorage
 * @returns AuthTokens object or null if not found or expired
 */
export function getAuthTokens(): AuthTokens | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    if (!serialized) {
      return null;
    }
    const tokens = JSON.parse(serialized) as AuthTokens;

    // Check if token is expired
    if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
      clearAuthTokens();
      return null;
    }

    return tokens;
  } catch (error) {
    console.error("Failed to retrieve auth tokens:", error);
    return null;
  }
}

/**
 * Clear authentication tokens from localStorage
 */
export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
  } catch (error) {
    console.error("Failed to clear auth tokens:", error);
    throw new Error("Could not clear auth tokens", { cause: error });
  }
}

/**
 * Save user profile data to localStorage
 * @param profile - User profile data
 */
export function saveUserProfile(
  profile: { name: string; email: string; picture?: string },
): void {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, serialized);
  } catch (error) {
    console.error("Failed to save user profile:", error);
    throw new Error("Could not save user profile", { cause: error });
  }
}

/**
 * Retrieve user profile from localStorage
 * @returns User profile object or null if not found
 */
export function getUserProfile(): {
  name: string;
  email: string;
  picture?: string;
} | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (error) {
    console.error("Failed to retrieve user profile:", error);
    return null;
  }
}

/**
 * Clear all user data from localStorage
 */
export function clearAllUserData(): void {
  clearAuthTokens();
  clearUserPreferences();
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } catch (error) {
    console.error("Failed to clear user data:", error);
  }
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export function isAuthenticated(): boolean {
  const tokens = getAuthTokens();
  return tokens !== null;
}
