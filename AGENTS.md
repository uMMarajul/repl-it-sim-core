# Agent Guidelines

## Component Structure
- Do not create unnecessary `index.ts` files for component exports
- Import components directly from their `.tsx` files (e.g., `import { Component } from './component'` instead of `import { Component } from './index'`)

## Validation
- Do not run `npm run build` for validation
- Use `bun run tsc --noEmit` for TypeScript validation
- Use `npm run lint` for ESLint validation