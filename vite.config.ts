import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works when hosted from a subpath
  // (e.g. GitHub Pages at https://berkes.github.io/boekjehokje/).
  base: "./",
  plugins: [react()],
});
