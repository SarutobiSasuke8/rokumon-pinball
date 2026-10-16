import { defineConfig, type Plugin } from "vite";

/**
 * itch.io build only (`vite build --mode itch`, run by `npm run build:itch`).
 * The Rokumon hub SDK is loaded from the root-absolute `/hub-bridge.js`, which
 * itch.io cannot serve and which would point outside the game there. The game
 * never depends on it, so the itch build drops the tag. The default build, used
 * by the hub, is unchanged.
 */
function stripHubBridge(): Plugin {
  return {
    name: "itch-strip-hub-bridge",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html.replace(/\s*<script src="\/hub-bridge\.js"><\/script>/, ""),
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "itch" ? [stripHubBridge()] : [],
}));
