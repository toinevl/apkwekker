import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacy: resolve(__dirname, "privacy.html"),
        bevestigd: resolve(__dirname, "bevestigd.html"),
        afgemeld: resolve(__dirname, "afgemeld.html"),
        ongeldig: resolve(__dirname, "ongeldig.html"),
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
