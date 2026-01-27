# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D Print Log UI - An Angular 20 web application for tracking 3D prints, printers, filaments, and print statistics. Uses Auth0 for authentication and communicates with a backend API at `printLogApiUrl`.

## Commands

```bash
# Development server (HTTPS on localhost:4200)
npm start

# Build
npm run build:dev          # Development build
npm run build              # Production build

# Testing
npm test                   # Run unit tests with Karma (watch mode)
npm run test:ci            # CI tests with ChromeHeadless and coverage

# Linting
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix lint issues

# E2E Tests
npm run e2e                # Open Cypress

# Formatting
npm run prettier           # Check formatting
npm run prettier:fix       # Fix formatting
```

## Architecture

### Module Structure
- **app-routing.module.ts** - Main routes with lazy-loaded feature modules
- **core/** - Singleton services, guards, resolvers, HTTP interceptors, and stores
- **shared/** - Reusable components, pipes, and SharedModule (exports Angular Material modules)
- **Feature modules** (lazy-loaded): `print/`, `printer/`, `filament/`, `analytics/`, `users/`, `settings/`, `feed/`, `apikeys/`, `printer-maintenance/`, `documentation/`, `home/`

### Key Services (in `core/services/`)
- **auth.service.ts** - Auth0 authentication, user profile management
- **print.service.ts** - CRUD for prints, image uploads, cost calculations
- **printer.service.ts**, **filament.service.ts** - Entity management
- **file-parsers/** - Slicer G-code parsers (Cura, PrusaSlicer, OrcaSlicer, Creality Print, Anycubic)

### Authentication Flow
- Auth0 SPA SDK with token caching in localStorage
- `AuthInterceptorService` adds Bearer tokens to API requests
- `allow-anonymous-request` header bypasses authentication for public endpoints
- `AuthGuard` protects authenticated routes

### Environment Configuration
- `src/environments/environment.ts` - Development (localhost:5001 API)
- `src/environments/environment.prod.ts` - Production
- `src/environments/environment.unittest.ts` - Unit tests

## Angular Conventions

Follow the patterns in `.github/copilot-instructions.md`:

- **Standalone components** are the default (do NOT set `standalone: true` explicitly)
- Use **signals** for state management with `input()`, `output()`, `computed()`
- Use **`inject()`** function instead of constructor injection
- Set `changeDetection: ChangeDetectionStrategy.OnPush`
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives
- Use `class` and `style` bindings instead of `ngClass`/`ngStyle`
- Use **Reactive forms** over template-driven forms
- Put host bindings in the `host` object of decorators, not `@HostBinding`/`@HostListener`
- Use `NgOptimizedImage` for static images

## Testing

- Unit tests use Jasmine + Karma with Chrome
- Test files are co-located with source files (`*.spec.ts`)
- E2E tests use Cypress with base URL `https://localhost:4200`
