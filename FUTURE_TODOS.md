# Future TODOs (not now, no priority)

Things worth doing eventually. None of these are urgent — parked on purpose.

## Infra / domains

- **Put Cloudflare in front of the origin.** Only if we want the origin hidden anyway
  (DDoS, privacy, not leaking the VPS IP) — which also moots the "all domains on one IP"
  question for free. Do it for those reasons, **not** ban-avoidance: Meta blocks domains/URLs,
  not shared hosting IPs, so multi-IP buys nothing against bans. The `CLOUDFLARE_RANGES`
  plumbing in the Caddyfile already anticipates this.

- **The real leverage is at the domain level**, not the IP: domain hygiene and keeping the
  destination private. We're already set up for the second part (ADR 0004 keeps the
  destination out of every public file).
