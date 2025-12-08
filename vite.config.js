import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-htaccess",
      closeBundle() {
        try {
          copyFileSync(
            join(__dirname, ".htaccess"),
            join(__dirname, "dist", ".htaccess")
          );
          console.log("✅ .htaccess copié dans dist/");
        } catch (error) {
          console.warn("⚠️ Impossible de copier .htaccess:", error.message);
        }
      },
    },
  ],
});
