# Releasing

Text Lantern releases are tag-driven. The workflow lives at
`.github/workflows/release.yml`.

From `main` (after merging what you want to ship):

```bash
pnpm release:patch   # or release:minor / release:major
```

That bumps `package.json`, commits, tags `v<version>`, and pushes. GitHub
Actions then runs the quality gate (typecheck, lint), builds the macOS, Linux,
and Windows installers — failing if the tag does not match the package version
— and publishes them to the
[Releases](https://github.com/beecode-rs/text-lantern/releases) page with
auto-generated notes. The workflow can also be run manually ("Run workflow")
as a dry run that builds everything without creating a release.

## Artifacts per platform

| Platform | Artifact | Built by |
|---|---|---|
| macOS | `Text-Lantern-<version>-universal.dmg` | `pnpm dist:mac` |
| Linux | `Text-Lantern-<version>.AppImage`, `text-lantern_<version>_amd64.deb` | `pnpm dist:linux` |
| Windows | `Text-Lantern-Setup-<version>.exe` (NSIS) | `pnpm dist:win` |

Installers are unsigned (no code signing yet — see the
[README feature status](../../README.md#feature-status)); macOS users need the
Gatekeeper workaround and Windows users the SmartScreen bypass described in the
[README](../../README.md#download--install).
