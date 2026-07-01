import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { transformWithEsbuild } from "vite";
import path from "path";

const jsxInJsPattern = /[\\/](app|components)[\\/].*\.js$/;

export default defineConfig({
  plugins: [
    {
      name: "treat-app-js-files-as-jsx",
      enforce: "pre",
      transform(code, id) {
        if (!jsxInJsPattern.test(id)) return null;
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
    react(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
