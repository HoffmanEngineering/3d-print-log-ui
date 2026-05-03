# 3D Print Log

[![CI](https://github.com/HoffmanEngineering/3d-print-log-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/HoffmanEngineering/3d-print-log-ui/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

The frontend for [3D Print Log](https://3dprintlog.com) — a web application for tracking 3D prints, printers, and filaments.

**Live app:** https://3dprintlog.com

## Features

- Log prints with photos, notes, slicer settings, and per-print cost tracking
- Import print settings automatically by uploading G-code files (Cura, PrusaSlicer, OrcaSlicer, Creality Print, Anycubic)
- Manage printers and track maintenance history
- Manage filament inventory with QR code labels for quick spool lookup
- View analytics and statistics across your print history
- Share prints on a public feed
- Integrate with external tools via API keys

## Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, configuration, and running tests.

## Tech Stack

- Angular 20
- Angular Material
- Auth0 SPA SDK
- Azure Static Web Apps

## Infrastructure

The production environment runs on Azure (Static Web Apps for the frontend). It is manually managed — there is no infrastructure-as-code in this repo. PRs that require infrastructure changes (new environment variables, auth configuration, hosting config) should call that out explicitly in the PR description.

## Related Repos

- [3d-print-log-api](https://github.com/HoffmanEngineering/3d-print-log-api) — the backend API
- [3d-print-log-cura-plugin](https://github.com/HoffmanEngineering/3d-print-log-cura-plugin) — Cura integration

## License

[GNU Affero General Public License v3.0](LICENSE)
