import typescript from "@rollup/plugin-typescript";
import resolve from '@rollup/plugin-node-resolve';
import PeerDepsExternalPlugin from 'rollup-plugin-peer-deps-external';

export default [
  {
    input: "./index.ts",
    output: [
      {
        file: "lib/index.mjs",
        format: "es",
        sourcemap: false,
        exports: "named",

      },
      {
        file: "lib/index.umd.js",
        name: "Ozef",
        format: "umd",
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
    external: ["react", "jotai", "zod"],
  },
];