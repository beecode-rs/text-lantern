# Text Lantern

## Rules

- **Always use the `writing-clean-ts` skill before writing or refactoring any TypeScript code** (services, components, UI, utilities, config, tests — anything in `src/`). Invoke it first and follow its conventions.
- **Use singular names for folders/directories** (e.g., `resource`, not `resources`; `script`, not `scripts`).
- **Always use absolute imports (`@src/...`), never relative imports** (`./` or `../`), for any import within `src/` — including files in the same folder (e.g., `@src/shared/language/languages-raw`, not `./languages-raw`).
