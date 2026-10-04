# 24: The Operator pulls the local mail catcher's image

Spec: docs/spec/phase-03-auth-and-editor.md
Covers: none directly. It unblocks the stories whose local tests follow a real email link (6, 7, 8, 14, 15), through 31 (spec, Implementation Decisions: Mail; Acceptance, first `# manual:` line)
Seams: the human's terminal; afterwards `docker images`
Blocked by: None (can start immediately)
Status: done

**What to build:** Nothing for an agent. Floor 2 keeps every image pull with the human, and plan section 9 says the Operator runs pulls when asked. Phase 3's local stack gains a mail catcher, Mailpit, set as PocketBase's SMTP in local runs only, so the tests can follow real verification and reset links. Its image was not on this machine, so the human ran, from any directory:

```sh
docker pull axllent/mailpit
```

The spec's other `# manual:` lines name no further network command. They are the Operator's acts on the VPS, in a real inbox and on real phones, and 32 holds them. Phase 3 adds no package: the Editor is static, with no build step and no new dependency.

Once the image is local, every later run uses it from the local image store with no network. If a run ever wants the network, the ticket that hit it parks with its output and the command. No agent fetches.

Done by the Operator 2026-10-04 (plan §11). Observed: `docker image ls --format '{{.Repository}}:{{.Tag}}'` lists `axllent/mailpit:latest`.

- [x] `docker images` lists `axllent/mailpit`.
- [ ] Nothing else is pulled or installed.
