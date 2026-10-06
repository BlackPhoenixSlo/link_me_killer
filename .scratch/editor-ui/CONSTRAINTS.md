# editor-ui run: shared constraints for every agent (read fully before working)

Repo: /Users/jakabasej/oflinkv2 (Hono app + PocketBase + Caddy; live at https://v2.ofl.ink). Read first:
- .scratch/goal-ai/RUN.md (status), CONTEXT.md (vocabulary: Creator, Visitor, Profile, Link, Mode, Escape, Reveal, Operator)
- docs/spec/phase-03-auth-and-editor.md and docs/spec/phase-04-stats.md are BINDING for the Editor and Stats.
- The run's design brief: docs/spec/editor-redesign.md (once written). The test inventory: .scratch/editor-ui/test-inventory.md.

Surfaces:
- Editor at /edit: app/editor/index.html, editor.js, stats.js, editor.css (vanilla JS, served as static files by app/server.js).
- Public Profile page: app/public/index.html, script.js, style.css. Landing page at /: app/public/landing.html.
- Design reference: link.me/ (saved link.me dashboard, React SSR output; its JS does not run). Use for layout, spacing, copy tone, flows. NOT for code. Never copy its assets/JS.

Hard rules:
1. No new dependencies, frameworks, build steps, image pulls, fonts from CDNs or packages. Vanilla HTML/CSS/JS served as now. System font stack only. If something truly needs a package, write the exact pnpm command in your report and stop there.
2. v1 (linkme_clone3/, Netlify, n8n) is never touched or read for Destinations. NEVER open linkme_clone3/netlify/functions/secrets.json. No file you write may contain a Destination host (the v1 Creator-site host). Before reporting, run: grep -rIl "$(printf 'onlyfans.%s/' com)" <paths you changed>  (the v1 Destination host; never write it literally) and confirm empty.
3. No deploy, no DNS, no push, no git commit (the coordinator commits). Do not run ./check.sh or tests/stack.sh unless your task says so: the suite must never run while another run or an oflinkv2 stack is up. Check with `docker ps --format '{{.Names}}' | grep -i oflink` first.
4. Same-origin PocketBase REST through the existing /api proxy allow-list (see app/server.js); no SDK. Creators still cannot set `verified`, Username (`username`) or `owner`. Keep the refused-save behaviour (a refused save keeps what the Creator typed, shows the error, nothing is lost).
5. Keep the Stats page's behaviour and data exactly (Today/7D/30D, per Link, per Country, "Unknown", "Deleted link"). Restyle only.
6. Only edit the files your task names. If you need a change in another file, write the exact change in your report instead.
7. Mobile-first: Creators edit on phones. Design at 375px first, then 768, then 1024+.
8. Accessibility: semantic HTML, labels on every input, focus-visible styles, 44px tap targets, contrast AA, prefers-reduced-motion respected.
9. Tests that select by text or selector may be updated to the new UI, never weakened or deleted. Prefer stable `data-test` attributes or role/label selectors. Keep existing `id`s and `data-*` hooks that tests use unless the test-inventory says otherwise; when you rename a hook, list old→new in your report.
10. YAGNI: no features beyond the spec. No new routes, collections or server changes unless the task says so.
11. Report format (final message): what you changed (files), how you verified (commands + real output lines), hooks renamed (old→new), anything you could not do and why, open questions for the coordinator. Keep it under 60 lines.
