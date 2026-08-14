# RemoteModelRow

- **Path:** `src/renderer/src/components/ui/RemoteModelRow.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 43

## What this file is for
A presentational row component that renders a single downloadable (remote) Piper voice: name, language, quality, size, an "installed" badge, and a Download button. It is dumb — all state (`installed`, `downloading`) and actions (`onDownload`) arrive via props. Consumed by the `DownloadModels` settings screen.

## Layer & placement assessment
- **Right layer?** Yes — pure presentational primitive with no business logic, exactly what `components/ui/` is for (alongside `ModelCard`, `Select`, `Slider`, `Toggle`, etc.).
- **Right process boundary?** Yes — renderer-only; imports only React-friendly modules (`lucide-react`, sibling UI, renderer `lib`, `shared`).
- **Dependency direction ok?** Yes — `components/ui` → `components/ui` (sibling `StarBadge`), `lib/format`, and `shared` (types + languages). No upward or circular imports; no `store`/IPC/`api` access in this dumb component.
- **Folder naming (singular rule):** VIOLATION — lives under two plural folders: `components/` and `ui/`. Per CLAUDE.md both should be singular (e.g. `component/ui/`), consistent with the existing singular `lib`/`store`/`service`/`util`/`controller`.
- **File naming:** OK (NOTE) — `.tsx` correctly used (exports JSX). Strict `writing-clean-ts` prescribes `kebab-case.tsx` (i.e. `remote-model-row.tsx`), but this file matches the established sibling convention in the folder (`ModelCard.tsx`, `StarBadge.tsx`, `SettingsGroup.tsx` are all PascalCase). Treat as a repo-wide convention drift, not a one-off mistake.

## Notes / concerns
- Naming nit only: the in-folder convention (`ModelCard.tsx`, `RemoteModelRow.tsx`, …) is PascalCase, which conflicts with the `writing-clean-ts` kebab-case rule for UI components. Flag for a single global rename pass if the convention is to be enforced; do not rename this file in isolation.
