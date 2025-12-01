import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  alias: {
    "@": path.resolve(__dirname, "./"), // or "./src" if using src directory
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    "permissions": [
      "tabCapture",
      "offscreen",
      "scripting",
      "storage",
      "desktopCapture",
      "tabs",
      "activeTab"
    ],
    "web_accessible_resources":[
        {
            "resources": ["content-scripts/content.js"],
            "matches": ["https://*/*","http://*/*"]
        }
    ]
  },
});