# Sidebar

- **Path:** `src/renderer/src/components/Sidebar.tsx`
- **Layer:** Component
- **Process:** renderer
- **Lines:** 54

## What this file is for
Renders the vertical settings navigation: the app icon/brand, a fixed list of section buttons (General, Models, Languages, Test, History, About), and a "Piper TTS · on-device" footer. It owns no state — `active` section and the `onChange` callback come from the parent (`App.tsx`). It also exports the `Section` union used as the shared identifier for which settings tab is selected.

## Layer & placement assessment
- **Right layer?** Yes — it is a feature component under `components/`, exactly where the architecture doc places `Sidebar`, and it is purely presentational (no store, no IPC, no business logic; driven entirely by props).
- **Right process boundary?** Yes — only React (`ComponentType`, JSX), `lucide-react` icons, and a static PNG asset. No `window`, no `ipcRenderer`, no Electron — renderer-clean.
- **Dependency direction ok?** Yes — imported only by `App.tsx` (the React root); it imports nothing from `lib`/`store`/`ui` or any main/preload module. Strictly downward.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/`; CLAUDE.md mandates singular folders (should be `component/`).
- **File naming:** NOTE — `Sidebar.tsx` is PascalCase; writing-clean-ts convention for UI component files is `kebab-case.tsx` exporting a PascalCase component (i.e. `sidebar.tsx` exporting `Sidebar`). The `.tsx` extension is correct since the file exports JSX.

## Notes / concerns
- The `Section` type is shared between this file and `App.tsx`; if a third consumer appears, consider promoting it to a `lib/` or shared renderer type module rather than re-exporting from a component.
- The `ITEMS` list hardcodes the section catalog in-component; acceptable for now, but if sections grow or gain permissions/visibility rules, lift it out (e.g. into a `lib/section` config) so the component stays dumb.
