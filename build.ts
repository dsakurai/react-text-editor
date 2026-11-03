import { build } from "esbuild";

await Deno.mkdir("public", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "esm",
  jsx: "automatic",
  outfile: "public/app.js",
});
