---

## Iteration GH‑0: GitHub foundation (branches, protections, sanity CI) done.

What we set up
- Branch model: main (default), staging, prod.
- CI: `.github/workflows/ci-sanity.yml` runs pnpm install and builds API/Web on PRs to main|staging|prod.
- Housekeeping: CONTRIBUTING.md, CODEOWNERS, issue/PR templates, SECURITY.md referenced.

Next
- Enforce branch protections in GitHub UI/API: require PRs, 1 approval, passing checks; dismiss stale reviews; disallow force pushes & deletions on main and prod.
