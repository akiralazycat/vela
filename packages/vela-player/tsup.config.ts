import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
    "web-component": "src/web-component.ts",
  },
  tsconfig: "tsconfig.json",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "es2020",
  external: ["react", "react-dom", "shaka-player"],
});
