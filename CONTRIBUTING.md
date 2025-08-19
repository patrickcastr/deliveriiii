Contributing

Thanks for your interest in contributing!

Branches
- main: default, protected
- staging: protected, for pre-prod validation
- prod: protected, release branch

Workflow
1. Fork or create a feature branch from main.
2. Open a PR to main (or staging/prod when appropriate).
3. One approval and passing CI required.

Setup
- Node 20 LTS, pnpm 9
- Install: pnpm install
- Build: pnpm -C apps/api build && pnpm -C apps/web build

Security
See SECURITY.md for reporting.
