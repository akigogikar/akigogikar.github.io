# Website release status — 2026-09-11

Owner and rollback decision-maker: Aki Gogikar.

## Prepared for release

The personal-site redesign, A-monogram branding, and custom Ask Aki widget
are prepared locally for the release process. This is not a claim that the
live chat integration is operational. The owner requested a local main commit;
this step does not publish or deploy the website.

Validation: `node scripts/build-site.mjs` runs widget regression tests and SEO
checks and builds an allowlisted static artifact. See the local command result
for the current outcome. Historical browser checks are in `ask-aki-readiness.md`.

## Remaining live-launch gates

- `assets/ask-aki-config.json` remains disabled with no endpoint or embed ID.
- Complete the backend release and verify production configuration/rollback.
- Configure the approved public embed, origin limits, quotas and session isolation.
- Verify runtime ActPass allow/deny behavior and grounded public answers.
- Enable the widget only after those checks pass; then publish and smoke-test
  akigogikar.com. Sales/CRM automation is not established by the widget tests.

Last deployment attempt in this task encountered production SSH reset/timeout;
current connectivity has not been rechecked for this local-only commit.

Failure criteria: private-data disclosure, bypassed authorization, ungrounded
security claims, or disabled configuration sending requests. Keep the widget
disabled on failure. For a later release, roll back to the prior reviewed site
revision or restore the disabled widget configuration; preserve server overrides.

## Local validation result

2026-09-11: all 18 widget tests passed; SEO, local links, JSON-LD, and
`git diff --check` passed. The build produced 15 allowlisted public files.
These checks do not establish live backend availability or authorization.
