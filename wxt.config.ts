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
    optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
},
  }),
  manifest: {
    permissions: [
      "tabCapture",
      "offscreen",
      "scripting",
      "storage",
      "desktopCapture",
      "tabs",
      "activeTab",
    ],
    "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },

  "web_accessible_resources": [
    {
      "resources": ["ffmpeg/ffmpeg-core.js","ffmpeg/ffmpeg-core.wasm","content-scripts/*","video-edited.html"],
      "matches": [
        "http://*/*",
        "https://*/*"
      ],
    }
  ],
  },
});
