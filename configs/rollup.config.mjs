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
      file: "lib/index.mjs",
      format: "es",
      sourcemap: false,
      exports: "named",
      globals: {
        react: "React",
        jotai: "jotai",
        zod: "zod",
      },
    },
    {
      file: "lib/index.umd.js",
      name: "Ozef",
      format: "umd",
      sourcemap: false,
      exports: "named",
      globals: {
        react: "React",
        jotai: "jotai",
        zod: "zod",
      },
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
