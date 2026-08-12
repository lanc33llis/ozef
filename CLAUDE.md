# Ozef Repository Guide

This guidance applies to the entire repository. Keep `AGENTS.md` and
`CLAUDE.md` byte-for-byte identical when changing repository guidance.

## Project

Ozef is a small React form factory powered by Zod 4 and Jotai. Public behavior
lives primarily in `src/ozef.tsx`; Zod compatibility helpers live in
`src/schema.ts`; React Testing Library coverage lives in `test/core.test.tsx`.

## Tooling

- Use Bun for dependency management and repository scripts. Do not add npm,
  pnpm, or Yarn lockfiles.
- Run focused tests while developing, then verify changes with:
  - `bun run test --runInBand`
  - `bunx tsc --noEmit`
  - `bun run build`
- Do not commit generated `dist` or `lib` output.

## Implementation Conventions

- Preserve the library's generic schema-derived types and existing component
  namespaces (`Form.Field`, `Form.Error`, `Form.Radio`, and `Form.Option`).
- Centralize Zod internals and version-shape compatibility in `src/schema.ts`.
  Avoid scattering `_def`, `def`, or concrete Zod class checks through React
  components.
- When recognizing a Zod schema feature, cover top-level Zod 4 schemas,
  chained `z.string()` validators, and optional/nullable/default wrappers when
  applicable.
- Keep default components thin and continue forwarding native element props and
  custom slot metadata.

## Tests and Documentation

- Add regression coverage for user-visible behavior and custom component
  contracts. Prefer assertions against rendered behavior over implementation
  details.
- Update the README when a public API, default, supported schema shape, or
  integration example changes materially.
- `package-docs/AGENTS.md` and `package-docs/CLAUDE.md` are consumer-facing
  guidance shipped as `dist/AGENTS.md` and `dist/CLAUDE.md`. Keep the source
  pair byte-for-byte identical and update it when public usage guidance changes.
