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
        blogIndex: resolve(__dirname, "blog/index.html"),
        blogBoete: resolve(__dirname, "blog/boete-rijden-zonder-apk-2026.html"),
        blogVerlopen: resolve(__dirname, "blog/apk-verlopen-dit-moet-je-doen.html"),
        blogHoeVaak: resolve(__dirname, "blog/hoe-vaak-apk-keuring.html"),
        blogChecklist: resolve(__dirname, "blog/apk-checklist-wat-wordt-gekeurd.html"),
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
