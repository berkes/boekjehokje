import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The base path is configured via the VITE_BASE environment variable,
// set in a .env file locally and in the CI pipeline for deployments.
// Defaults to "/" (domain root, e.g. the dev server).
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env["VITE_BASE"] || "/",
    plugins: [react()],
  };
});
