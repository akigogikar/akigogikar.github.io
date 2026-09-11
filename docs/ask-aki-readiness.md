# Ask Aki — local readiness record

Run/artifact ID: `ASK-AKI-LOCAL-QA-20260905`

Logo follow-up: the floating Ask Aki launcher now reuses the header's exact
`assets/favicon.svg?v=2` A monogram instead of the star. Browser DOM and visual
inspection confirmed the asset loaded; 18 website tests and the build passed.
Latest local site artifact: `dist/site-1788636556309/` (not deployed).

Backend follow-up: an isolated retrieval patch is prepared at
`/Users/akhileshgogikar/.codex/worktrees/onenew-ask-aki-readiness-20260905`, branch
`codex/ask-aki-embed-readiness-20260905`. See its
`docs/ASK_AKI_EMBED_READINESS.md`. Syntax/format checks and read-only review passed.
After the owner approved focused local tests, 40 mocked backend tests passed;
7 failed against the original implementation, and all 40 passed again after
restoring the patch. These are local regression results, not live grounding or
authorization proof. The strict public ActPass gate is documented but not
implemented or activated. The owner specified *The Standing Query* reader edition
as its policy basis, replacing the coarse Q&A-versus-sales scope question.
Book-derived requirements are recorded in the backend readiness document;
deployment-specific authority and capability bindings remain unset.

Owner: Aki Gogikar. Operator: Codex. Scope: reversible local testing under the
owner's request to continue; no live backend mutation or publication authorized.
Outcome: verify the custom website widget, not the OneNew administration UI.

## Evidence checked on 2026-09-05

| Check | Result | Evidence |
| --- | --- | --- |
| Homepage and press logo | Pass | Browser loaded the same A-monogram SVG used by each page's favicon. |
| Synthetic streaming reply | Pass | Local browser fixture rendered chunks and completed with an explicit public OneNewAI citation. |
| Untrusted response markup | Pass | `<img src=x onerror=alert(1)>` remained literal text; zero injected message images. |
| Backend error | Pass | Generic recovery message; synthetic private error detail was not displayed. |
| Edit and retry | Pass | Original question restored and composer focused. |
| Stop | Pass | Cancellation showed "Response stopped." and restored editing. |
| New conversation | Pass | Messages cleared, welcome restored, composer focused. |
| Escape | Pass | Dialog closed and focus returned to its launcher. |
| Browser warnings/errors | None observed | Fixture browser log inspection after the smoke checks. |
| Real preview disabled state | Pass | Suggested question produced "Nothing was sent"; configuration remains disabled. |
| Automated checks | Pass | `node scripts/build-site.mjs`: 18 tests passed; SEO command completed successfully. |
| Patch formatting | Pass | `git diff --check`. |

The fixture runs only on loopback port 4180 and intercepts chat fetches with
synthetic responses. These checks do **not** prove a live OneNew conversation,
knowledge grounding, authentication, network SSE behavior, or ActPass execution.

## Release artifact

`dist/site-1788635207063/` contains 15 selected public files. The homepage has no
fixture script; the copied chat config has `enabled: false` and empty endpoint
and embed ID. No commit, push, deployment, public embed activation, or external
communication occurred in this run.

## Open launch gates

1. Verify that the public Query-mode embed can retrieve Ask Aki's approved
   knowledge. Earlier inspection found a zero-vector guard that could reject
   questions before canonical retrieval. A document upload alone is not proof.
2. Obtain and verify the intended public HTTPS endpoint, origin restrictions,
   quotas, session isolation, and an owner-approved public embed.
3. Do not label the public chat "fully ActPass protected" without an evidenced
   authorization path. Sales actions need separately guarded execution and
   approval; a public Q&A response or email link is not sales automation.
4. Re-check public claims, including the existing book blurb, before publication.
5. Obtain fresh approval for live configuration changes and publication through
   the applicable ActPass process.

## Backend source evidence (not runtime proof)

Read-only review of local OneNew-Server HEAD
`2b2925229421158160e2a1ffa4f5f29b1c725ea2` confirmed:

- `server/utils/chats/embed.js:49–63` exits Query mode when the legacy namespace
  is missing or its count is zero, before knowledge retrieval.
- `server/utils/chats/embed.js:99–114` also skips `searchWorkspaceRetrieval`
  when the embeddings count is zero. Removing only the earlier guard is not a
  complete fix.
- `server/utils/retrieval/adapter.js:519` returns on a dense retrieval error
  before the later Postgres sparse path at `:573–579`.

Do not switch to unrestricted Chat mode to evade the guards. First establish
which approved retrieval store is populated, then test the intended Query-mode
path in isolation, retaining empty-evidence refusal and tenant/access checks.
No server source change, embedding job, or live retrieval test was performed.

The inspected public request chain has no demonstrated ActPass decision gate:
`server/endpoints/embed/index.js:24–26,46–51` calls the embed handler through
CORS, embed validation, connection metadata, and quota middleware;
`server/utils/middleware/embedMiddleware.js:51–155` checks enabled/origin/input
and quotas; `server/utils/chats/embed.js:192–214` invokes LLM completion and
streaming. Global middleware/mounts inspected at `server/index.js:112–119,141,173`
did not establish an ActPass gateway either. This source-only conclusion does
not establish deployed parity or rule out an external/provider gateway.

Any isolated retrieval correction must test canonical evidence with zero legacy
vectors, a genuinely empty workspace, and retrieval failure, preserving the
no-evidence refusal at `server/utils/chats/embed.js:157–171`.

## Failure criteria and rollback

Failure means leaked private data, live calls from disabled configuration, unsafe
HTML rendering, inaccessible controls, or fabricated backend/security claims.
The public integration stays disabled on any failure. Stop the temporary fixture
after QA and retain the normal local preview only. No production rollback is
needed because production was not changed. Existing dirty work is preserved.
