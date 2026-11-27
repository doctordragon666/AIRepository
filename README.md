# AIRepository

A small Minecraft-style browser game that runs with plain HTML/CSS/JavaScript.

## Play locally

1. Download this repository.
2. Open `index.html` in a browser.

## Controls

- `A` / `D`: move left and right
- `Space`: jump
- `Left click`: break block
- `Right click`: place selected block
- `Q`: switch block type

## Deploy with GitHub Pages

This repository includes [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. Open repository settings in GitHub.
2. Go to Pages.
3. Set source to GitHub Actions.
4. Push to `main` branch (already done after this commit).
5. Wait for workflow to finish in the Actions tab.

After deployment, the site URL is usually:

`https://doctordragon666.github.io/AIRepository/`

## Security Review and Adversarial Tests

Date: 2026-11-27

Hardening applied:
- Added strict browser policies in `index.html`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Removed external Google Fonts runtime dependency and switched to local-safe font stack.
- Pinned all GitHub Actions in `.github/workflows/deploy-pages.yml` to immutable commit SHAs.
- Reduced workflow token permissions with least privilege.

Adversarial test checklist:
- XSS/DOM injection review: no `innerHTML`/`eval` style dangerous sinks in runtime path; HUD updates use `textContent`.
- CSP bypass attempts (inline script and remote script injection): expected blocked by CSP.
- Mixed-content downgrade attempts (`http://` resource load): expected blocked/auto-upgraded.
- CI/CD poisoning check: action refs are SHA-pinned instead of moving tags.

Residual risks:
- Some protections (for example anti-framing) are strongest as HTTP response headers, while static hosting has limited header control.
- If repository write access is compromised, first-party code can still be altered.
- Any future feature that renders user input should trigger a new security review.
