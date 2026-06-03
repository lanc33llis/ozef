import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import PeerDepsExternalPlugin from "rollup-plugin-peer-deps-external";

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
  ],
};

export default config;
