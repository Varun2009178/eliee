import { createAuthClient } from "better-auth/react";

// Auto-detect base URL for production
function getBaseURL() {
  // In browser, use current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback to env var or localhost
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
  getSession 
} = authClient;

