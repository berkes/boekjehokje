/**
 * Utility for fetching user profile from Google People API
 * Replaces manual JWT decoding with proper API calls
 */

// Types for Google People API response
interface Name {
  displayName: string;
  givenName?: string;
  familyName?: string;
}

interface EmailAddress {
  value: string;
  type?: string;
}

interface Photo {
  url: string;
}

export interface GooglePeopleProfile {
  names?: Name[];
  emailAddresses?: EmailAddress[];
  photos?: Photo[];
}

/**
 * User profile extracted from Google People API response
 * picture is a URL. We use it directly in img tags with crossOrigin="anonymous"
 * and provide initials as fallback. Simple and avoids 429/ CORS issues.
 */
export interface UserProfile {
  name: string;
  email: string;
  picture?: string; // URL to profile picture (may be rate-limited)
}

/**
 * Fetches user profile from Google People API
 * @param accessToken - OAuth 2.0 access token
 * @returns User profile with name, email, and picture URL
 * @throws Error if the request fails or profile data is incomplete
 */
export async function fetchGooglePeopleProfile(
  accessToken: string,
): Promise<UserProfile> {
  const personFields = "names,emailAddresses,photos";
  const url = `https://people.googleapis.com/v1/people/me?personFields=${personFields}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Google People API request failed: ${response.status} ${response.statusText}` +
        (errorData.error?.message ? ` - ${errorData.error.message}` : ""),
    );
  }

  const data: GooglePeopleProfile = await response.json();

  // Extract profile information
  const name = data.names?.[0]?.displayName || "Unknown";
  const email = data.emailAddresses?.[0]?.value || "";
  const picture = data.photos?.[0]?.url;

  if (!email) {
    throw new Error("No email found in Google People API response");
  }

  return {
    name,
    email,
    picture,
  };
}
