import { copyFileSync } from "node:fs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import PeerDepsExternalPlugin from "rollup-plugin-peer-deps-external";

const copyAgentDocs = () => ({
  name: "copy-agent-docs",
  closeBundle() {
    for (const name of ["AGENTS.md", "CLAUDE.md"]) {
      copyFileSync(
        new URL(`../package-docs/${name}`, import.meta.url),
        new URL(`../dist/${name}`, import.meta.url),
      );
    }
  },
});

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "./index.ts",
  external: ["react", "jotai", "zod"],
  output: [
    {
      file: "dist/index.mjs",
      format: "es",
      sourcemap: false,
      exports: "named",
    },
    {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: false,
      exports: "named",
    },
  ],
  plugins: [
    resolve(),
    PeerDepsExternalPlugin(),
    typescript({
      tsconfig: "./configs/tsconfig.esm.json",
      sourceMap: false,
    }),
    copyAgentDocs(),
  ],
};

export default config;
