# Contributing

## Development

Requires Node.js 20+.

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build:chrome
```

Load `dist/chrome` or `dist/firefox` in the browser. Do not load the repository root. The shipping manifest is generated at build time.

After a rebuild, click **Reload** on the extension card.

## Pull requests

1. Branch from `main` with a focused prefix: `feat/`, `fix/`, `docs/`, or `chore/`.
2. Keep the change reviewable. Prefer one concern per pull request.
3. Run `npm test`, `npm run typecheck`, and `npm run lint` before you open the PR.
4. Do not commit `dist/`, `coverage/`, or secrets.
5. Open the PR against `main`. GitHub Actions must stay green.

## Product rules

- Manifest V3 only. Do not add content scripts, host permissions, analytics, accounts, or remote application code.
- Never close every tab in a duplicate group.
- Revalidate tabs before closing them.
- Treat titles and URLs as untrusted text.

Internal architecture notes live in [AGENTS.md](AGENTS.md).
