import React from "react";
import googleLogoUrl from "./googleLogo.svg";
import { useUser } from "../context/useUser.ts";

// Re-export the provider wrapper so app wiring stays unchanged
export {
  GoogleAuthenticationWrapper as GoogleAuthWrapper,
} from "../services/authentication/index.ts";

/**
 * Main Google authentication button component
 * Uses Dutch text per project plan
 */
export function GoogleAuthButton(): React.JSX.Element {
  const { isLoading, login } = useUser();

  if (isLoading) {
    return <div className="authentication-loading">Laden...</div>;
  }

  return (
    <button
      type="button"
      onClick={() => {
        login();
      }}
      className="google-authentication-button"
      style={{
        padding: "10px 20px",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "16px",
      }}
    >
      <img
        src={googleLogoUrl}
        alt="Google"
        style={{ width: "20px", height: "20px" }}
      />
      Inloggen met Google
    </button>
  );
}
