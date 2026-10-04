# 14: The v1 Import repairs or refuses every v1 file before it writes anything

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 25, 37, 41, 42, 43, 46, 47, 48, 49, 50, 52
Seams: the v1 Import CLI run with this Mac's Node against v1-shaped trees, with no PocketBase reachable (the app image that will carry it is not built until 13). Observed through its printed lines and exit code
Blocked by: 03: Test Secrets sit beside the Fixture Profile and are never served
Status: claimed 20261004T191309Z 2026-10-04T21:08:55Z

**What to build:** The Operator's one import command, up to the point where it would first contact PocketBase. It takes one or more v1-shaped site directories, such as the v1 Snapshot and the Fixture site. It reads and validates every Profile file, secrets file and image path before anything is written, and plans the Profiles and Links it will write:
- **Usernames.** The Username is the file's name, lower-cased.
- **Repairs.** weiwei's trailing comma is repaired, with `repaired:`. A file still invalid after that is refused. jaka7q's n8n-expression display name becomes its Username, with `repaired:`.
- **Every card survives.** Each entry in a Profile's Links becomes its own Link, in file order, keyed privately by its v1 id and its occurrence in the file. The Link Id it will get is fresh and random, never a v1 id.
- **Destinations.**
  - A secrets entry that no Link in its site uses is dropped and named by key.
  - A non-Adult Link with a secrets entry keeps its own url as its Destination, and the entry is dropped with a warning. That includes the OnlyFans ones, which stay non-Adult.
  - An Adult Link with no entry gets no Destination and is named with `no destination:`.
  - A relative non-Adult url becomes root-relative.
- **Images.** An image a Profile names but its site lacks becomes no image, with `missing image:`. Converting a non-WebP v1 image waits for the Image pipeline in 21. None exists in the v1 Snapshot today.
- **Modes.** Every new Profile takes Escape Mode as its default and its Links inherit it, unless the file carries a valid Mode, as the Fixture Profile does.
- **Case twins.** A twin with equal bytes is skipped once with `skipped: … case twin of …`. A twin whose bytes differ refuses the run, and so does one Username in two sites.
- **Refusals.** Anything else wrong refuses the run with one `invalid v1 file: <path>: <reason>` line per problem and exit 1, before any contact with PocketBase. That covers a file with no profile object or Links array, a name that is not a valid Username, and a Destination that is neither an absolute http(s) URL nor a root-relative path on a Link that uses it.

No printed line ever holds a Destination. Lines name a file, Username, card position or secrets key. The v1 Snapshot is only read.

This ticket also commits the broken v1-shaped tree that the import spec's refusal case uses. It holds one valid Profile, `importcheck_ok`, one file still invalid after the trailing-comma repair, and one Profile without a Links array. Every url in it is on example.com.

ASSUMPTION: the import's read-and-validate half lands before the network commands and is checked with this Mac's Node (v23 here), so it uses no package. Its writes, and its run inside the app image through Compose, come in 15 (rung 5; the invocation keeps offline work ready-for-agent). It leaves the app's manifest as 12 wrote it. Overturned if reading the input needs a package. This ticket then waits on 13.

ASSUMPTION: offline, the success path is observed by letting the run stop at its first write with exit 2, after it has printed its repair lines. No dry-run flag is added, since the spec asks for none (rung 5, YAGNI). Overturned if exit 2 must mean an answer from PocketBase rather than a refused connection. This ticket then checks only refusals offline, and the success-path lines are checked in 15.

ASSUMPTION: case twins are checked in 19, inside a Linux container. This Mac's case-insensitive filesystem cannot hold Jaka.json beside jaka.json (rung 1: the spec observes 27 files here and 30 on Linux). Overturned if a case-sensitive scratch volume is at hand. The twin cases can then run here too.

- [ ] Against the committed broken tree, the run exits 1 with exactly one `invalid v1 file:` line per bad file, none naming `importcheck_ok`, and never contacts PocketBase.
- [ ] The run takes the v1 Snapshot and then the Fixture site, given as the seed will see it: a temporary copy of the fixtures with the Page Copy's stock icons as its images. Nothing is added inside the fixtures folder, whose file list Phase 0 checks. No file is refused. The lines match what the spec observed on this Mac's checkout:
  - weiwei and jaka7q are `repaired:`;
  - the 10 orphan secrets keys are dropped by key;
  - each of the 4 non-Adult Links that have a secrets entry gets a dropped-entry warning;
  - the Fixture site gives three `dropped:` lines;
  - 6 `missing image:` lines name the avatars of bnjmklk, ja123, jaka, jaka5, jaka6q and jaka7q;
  - 8 `no destination:` lines.

  The run then stops at its first write.
- [ ] No line of any run holds a Destination from its input. A check compares the output with the inputs' urls and secrets values and prints only a boolean.
- [ ] The v1 Snapshot's git status is clean afterwards.
- [ ] `./check.sh` still passes on the Dev-Server Stand-in.
