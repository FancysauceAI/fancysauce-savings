# Changelog

All public releases of `fancysauce-savings`. Most recent first.

## v0.13.1 — 2026-07-31

No plugin code changed in this release: the published Claude Code and Codex
artifacts are byte-identical to v0.13.0. This release corrects the MDM
deployment templates.

### Fixes

- The MDM deployment templates now pin v0.13.0 rather than v0.12.0. On an
  MDM-managed machine the enforced managed hook is authoritative and a
  plugin-marketplace install does not upgrade it, so fleets deployed from
  the v0.13.0 templates would have kept running the previous release and
  received none of the Codex subscription-usage capture. Re-deploy the
  templates to pick it up.

## v0.13.0 — 2026-07-31

### Features

- Codex subscription usage is now visible. Codex writes a rate-limit gauge
  into its session files on every turn — how much of your 5-hour and weekly
  windows you have consumed, when they reset, your plan, and whether credits
  are available — and the plugin previously discarded it. It is now captured
  three ways: the gauge rides each `api.request`, so consumption and the
  window position it was consumed at land together; a `usage_limit.snapshot`
  carries readings from turns that report no tokens; and a
  `usage_limit.exceeded` fires when a window saturates. Plan and credit
  posture is reported separately as it changes. Together these make
  subscription overage measurable for Codex seats, where the vendor exposes
  no per-seat spend reporting of its own.
- Claude Code compaction is now recorded on the `PostCompact` hook, so
  `compaction.after` is emitted reliably instead of being inferred.
- Historical subagent transcripts are backfilled by the scan, so work that
  ran before the plugin was installed is no longer missing from session
  history.

### Fixes

- Codex `gpt-5.6` models are priced, so those turns carry a cost estimate
  instead of none. Turns on the current model lineup were previously
  reported with tokens but no cost.
- Claude Code now recognises the "you've hit your org's monthly spend limit"
  message as an org spend cap rather than an unknown limit, so a capped
  organisation is distinguishable from an exhausted individual seat.
- A Codex cursor lock is released when a telemetry flush fails, instead of
  being held until it goes stale. A failed flush could previously cause the
  next run to silently skip that session's new activity.
- The Codex floating install ref no longer advances past the last resolved
  commit, so a floating pin resolves deterministically.

### Notes

- This release bakes the production identity key, which activates the
  encrypted identity envelope. Seat identity is encrypted to that key and is
  readable only by the fancysauce backend.

## v0.12.2 — 2026-07-29

### Fixes

- fix(codex): stop the rollout tail replaying its window on derived-sink failure (#76)

## v0.12.1 — 2026-07-29

No plugin code changed in this release: the published Claude Code and Codex
artifacts are byte-identical to v0.12.0. This release ships the MDM deployment
templates publicly and corrects a Codex interoperability failure in them.

### Fixes

- Codex managed hooks no longer set `hooks.managed_dir`. Codex composes every
  requirements layer that is present rather than letting the highest-precedence
  one win, so when another tool deployed its own layer with a different
  `managed_dir`, Codex failed to load any config and would not start at all. The
  field is optional and gained us nothing — managed hooks are auto-trusted by
  virtue of their source layer, not their directory, and our hook commands are
  already absolute paths. Unset, our layer composes with any other tool's. (#70)
- The MDM templates and guides are now published to this repo as `mdm/` by the
  release process instead of being copied in by hand, so they track the tested
  source and can no longer be silently dropped by a later publish. (#71)

### Features

- Codex zero-step telemetry via an enforced `requirements.toml` managed hook,
  plus a single Kandji script that deploys both tools. Deployment templates
  only — no change to the plugin runtime. (#64)

## v0.12.0 — 2026-07-10

### Features

- Headless / CI authentication: export a tenant-scoped `FANCYSAUCE_TENANT_KEY`
  before launching Claude Code or Codex and the plugin durably writes the 0600
  credential on the first hook fire — no browser, no hand-authored
  credentials.json. Also available as an explicit step via
  `/fancysauce-savings:login`. Each graduated-key writer owns its own
  provenance, so the ambient path never clobbers a URL-flow or interactive
  login credential. (#65)
- Native identity in a secure envelope: adopt the native Claude Code / Codex
  account identity, carried in an encryption-gated secure envelope aligned with
  the server contract. (#60)

## v0.11.0 — 2026-07-01

### Features

- Subscription usage-limit / overage telemetry: the Claude Code collect agent
  now captures account posture and usage-limit / overage signals (new
  account-posture / usage-config / usage-limit modules). (#46)

### Fixes

- Codex marketplace now lists its plugin: the published marketplace manifest was
  missing the `source: "local"` discriminator, so Codex silently dropped the
  entry (marketplace registered, but zero plugins listed). (#58)

### Changes

- Codex marketplace/plugin renamed to match Claude Code — marketplace
  `fancysauce` and plugin `fancysauce-savings` (were `fancysauce-codex` /
  `fancysauce-savings-codex`). (#58)
- Normalize GitHub org casing `FancySauceAI` -> `FancysauceAI` across manifests,
  release templates, and install commands to match GitHub's canonical login
  (previously resolved only via case-insensitive redirect). (#58)

## v0.10.0 — 2026-06-24

### Features
- Tenant URL install: revive the per-tenant marketplace-URL install for managed
  tenants — a per-tenant marketplace.json delivers an ingest-only tenant key once
  via a SessionStart bootstrap hook that graduates it into a 0600 credential file;
  telemetry hooks stay key-less. (#55)
- URL-flow variant publishing: publish-dist publishes a manifest-less plugin
  variant to a url-flow branch + v{VERSION}-url tag (or a separate repo via
  --url-repo), with a full repo+ref+sha handoff pin. (#56)

## v0.9.1 — 2026-06-19

### Features

- feat(smoke): local Codex install harness + telemetry inspector
- feat(publish): --tool codex publishes to a separate dist repo
- feat(release): lockstep-bump the Codex manifest + marketplace
- feat(codex): login skill + stage skills/ in the codex package
- feat(codex): marketplace catalogue + install README template
- feat: fancysauce.agent resource attribute (claude-code | codex-cli)
- feat(codex): rollout tailer → api.request with client-side cost + tokens_reasoning
- feat(codex): rollout parser (last_token_usage → api.request, stateful model)
- feat(codex): pricing table + client-side cost
- feat(codex): --tool codex packaging + e2e
- feat(codex): adapter, hook entry, hooks.json, manifest
- feat(codex): hook-event mapper (verified rust-v0.136.0 shapes)
- feat(types): add PostCompact to HookEventName (Codex), inert CC mapping

### Fixes

- fix(codex): root hook commands at ${CLAUDE_PLUGIN_ROOT}; repath CC commands; dedup subagent uuids
- fix(sinks): refresh session-index on stop so Codex sessions show live cost
- fix(codex): deterministic api.request event_uuid for idempotent replay
- fix: repath url-consistency test import + data-dir comment after relocation

### Documentation

- docs(codex): release runbook (dual-tool cutover)
- docs: Codex Phase 5 (release wiring) plan
- docs: point v1 contract at the dual-tool v1.1 addendum + change-rule for new agent source
- docs: Phase 4 plan + backend contract v1.1 (dual-tool)
- docs: Codex Phase 3 (rollout tailer → api.request) implementation plan
- docs: Codex pricing research for client-side cost (draft, pending validation)
- docs: Codex Phase 2 (hooks-only) implementation plan
- docs: verified Codex hook+rollout shapes from openai/codex rust-v0.136.0
- docs: rewrite relocation plan for the real origin/main inventory
- docs: flag shared tail-engine extraction as a Phase-3 watch-item (§5.2a, §9)
- docs: re-ground dual-tool design against origin/main (#41 credential model, sinks, backfill)
- docs: Phase 1 implementation plan (behavior-preserving refactor)
- docs: design for dual-tool telemetry (Claude Code + Codex)

## v0.9.0 — 2026-06-05

### Features
- **`/enterprise-cost`**: estimate whether moving a team from a flat seat-based
  plan to Enterprise usage-based pricing (USD 20/seat + API rates) would cost more
  or less, projected from your real Claude Code usage via a seeded log-normal
  Monte-Carlo. (#45)
- **Tenant-wide install with per-user identity**: env-var fallback,
  hashed-by-default identity, and MDM (Jamf/Intune) reference templates. (#41)

### Fixes
- **Pricing**: add Claude Opus 4.8 rates — recent usage previously priced at $0. (#45)
- Cost reports now omit zero-token `<synthetic>` placeholder turns from the
  unknown-models footer. (#45)

## v0.8.0 — 2026-05-22

### Fixes

- fix(skill): add Enterprise as own Q1 family; drop show-all from Q2

## v0.7.2 — 2026-05-21

### Fixes

- Plan-selection funnel: Enterprise is now its own Q1 entry (was conflated with "Show all tiers" in v0.7.1). Q1 options are now Pro / Max / Team / Enterprise — exactly 4 to match AskUserQuestion's cap. Q2 sub-questions reach all 7 tiers cleanly:
    - Max → 5x / 20x
    - Team → Standard / Premium
    - Enterprise → Usage-based / Premium seat
- "Show all tiers" is no longer an in-funnel option. Users who want the multi-tier comparison can invoke the slash command or bin directly without `--plan`.

No code or pricing changes — SKILL.md and the slash-command markdown are the only files updated.

## v0.7.1 — 2026-05-21

### Fixes

- Skill prompt now uses a two-question funnel for plan selection. The v0.7.0 SKILL.md listed all 8 plan choices (Pro, Max 5x, Max 20x, Team Standard, Team Premium, Enterprise usage-based, Enterprise Premium seat, Skip) in a single AskUserQuestion call. AskUserQuestion caps at 4 options, so Team plans were silently dropped from the user-visible picker. Q1 now asks plan family (Pro / Max / Team / Enterprise-or-show-all) and Q2 asks the sub-tier only for Max or Team.
- No code or pricing changes; SKILL.md and the slash-command markdown are the only files updated.

## v0.7.0 — 2026-05-21

### Breaking changes

- Skill / slash command renamed: **`price-hike-estimator` → `bill-check`**.
    - Skill: `fancysauce-savings:price-hike-estimator` → `fancysauce-savings:bill-check`
    - Slash command: `/fancysauce-savings:price-hike-estimator` → `/fancysauce-savings:bill-check`

### Features

- **Yearly amortization.** The usage-by-entrypoint table gains an `Est./yr` column (12× monthly). The Plan Impact section now shows both monthly and yearly figures for credit, burn, headroom, and bottom-line verdicts.
- **Single-tier focused output.** When the user invokes with `--plan <tier>`, the multi-tier comparison table collapses to a focused four-line block (Plan / Credit / Your burn / Headroom). The bottom-line verdict is phrased only about the selected tier, no extra noise from the six tiers the user didn't pick.
- **Interactive flow.** The skill (and slash command) now lead with `AskUserQuestion` to learn which Claude plan the user is on, then run `bill-check.mjs --plan <id>` automatically. The user can pick "Skip / show all tiers" to get the full multi-tier comparison.
- **Terminology.** The combined `sdk-cli` + `sdk-py` + `sdk-ts` bucket is now called **"programmatic usage"** consistently in user-facing output. Section header is now "Programmatic usage impact" (was "Agent SDK billing impact").

### Fixes

- Verdict-classification bug under `--plan` filtering: when the tier list was narrowed to one entry, the multi-tier branching incorrectly matched "Pro / Team-Standard won't cut it" for any well-under-cap selection. Fix introduces a dedicated single-tier verdict path that speaks only about the selected tier.

## v0.6.1 — 2026-05-21

### Breaking changes (slash commands)

- Slash commands moved from `commands/fancysauce/<name>.md` to `commands/<name>.md`. The middle `fancysauce` segment was a leftover from when the plugin itself was named `fancysauce`, and now just duplicated the brand. New invocation form:
    - `/fancysauce-savings:login`              (was `:fancysauce:login`)
    - `/fancysauce-savings:upload-history`     (was `:fancysauce:upload-history`)
    - `/fancysauce-savings:reset`              (was `:fancysauce:reset`)
    - `/fancysauce-savings:price-hike-estimator` (was `:fancysauce:price-hike-estimator`)
- Skill name is unchanged: `fancysauce-savings:price-hike-estimator`.

### Documentation

- README slash-command list now matches the new path shape and includes a `price-hike-estimator` entry (was missing).

## v0.6.0 — 2026-05-21

### Features

- New `price-hike-estimator` skill, slash command, and bin: walks the user's local Claude Code transcripts, breaks usage down by invocation entrypoint (Interactive / Headless / Agent SDK / VSCode), estimates per-month cost from bundled pricing, and computes per-tier headroom against Anthropic's 2026-06-15 Agent SDK billing change. The skill leads the model with a categorical verdict (`Non-event`, `Free runway`, `Watch the cheaper tiers`, `Plan for overage`, etc.) framed as problem or opportunity for the user's specific pattern (#39).
- CLI flags: `--since YYYY-MM-DD` (date filter), `--plan <tier>` (narrows the impact section to one plan tier: pro / max-5x / max-20x / team-std / team-prem / ent-usage / ent-seat), `--json` (structured output), `--projects-dir` (override default `~/.claude/projects`).
- Bundled pricing covers Claude 4.x flagship models (Opus 4.7 / 4.6 / 4.5 / 4.1 / 4, Sonnet 4.6 / 4.5 / 4, Haiku 4.5) plus retired Haiku 3.5 — sufficient for the trailing ~6 months of historical transcripts.
- Subagent transcripts (under `<sid>/subagents/*.jsonl`) now roll up into the parent session's totals so heavy Task-tool usage isn't undercounted (~26% input / 33% cache-read uplift on heavy-subagent histories).

### Fixes

- `isDirectInvocation` in the bin realpaths both sides of the comparison so a symlinked install path (e.g. macOS `/tmp` → `/private/tmp`) doesn't silently bypass `main()`.
- SKILL.md narrative-context dollar amounts are spelled out as USD literals so they survive CC's skill-injection variable expansion into the model context.

### Documentation

- README + CHANGELOG follow-on tweaks from the v0.5.0 release work.

## v0.5.0 — 2026-05-18

v0.5.0 reshapes the install flow around local-first capture and a long-lived bearer credential.

### Features

- **Local-first capture.** Events are queued on disk on every fresh install. No network traffic to `ingest.preview.fancysauce.ai` until the user signs in. Statusline, end-of-session receipt, and cross-session session-index all work without any backend interaction.
- **`/fancysauce:login` — browser-based sign-in.** A single command opens the browser to `https://preview.fancysauce.ai/cli/install` to authenticate, and a long-lived `fs_live_*` credential is exchanged and stored at `~/.config/fancysauce/credentials.json`.
- **`/fancysauce:upload-history` — opt-in backfill.** After sign in, users can run this command to upload their local history to Fancysauce.
- **`/fancysauce:reset` — local data wipe.** Interactive (`wipe` confirmation) wipe of queue, cursors, session index, and `install_id`. `--all` extends to the user-local credential file. `--queue-only` retains state. A managed system credential at `/etc/fancysauce/credentials.json` is never touched.
- **MDM support.** System credentials at `/etc/fancysauce/credentials.json` take precedence over user-local credentials at resolve time. `/fancysauce:login` refuses (exit code `2`) when a managed credential is in effect; `/fancysauce:reset --all` warns and leaves the system credential intact. Lets fleets push tenant-scoped credentials without per-machine intervention.
- **Plugin-scoped data directory.** Local data lives at `~/.claude/plugins/data/<plugin>-<marketplace-alias>/`.
- **Per-session transcript tailing.** A per-session cursor under `state/sessions/<session_id>/transcript_cursor.json` tracks the last byte read from CC's transcript file, so resumed sessions don't re-emit historical events.

## v0.4.4 — 2026-05-10

### Security

- **API key removed from `node` argv** (F-02 narrowed). The rendered hook command now passes the key via an environment-variable prefix (`FANCYSAUCE_API_KEY=… node …`) rather than `--api-key …`. The shell process that interprets the rendered command still has the key in its own `argv` for the hook's lifetime; full closure (key written to a file at install time, read by the hook) is tracked as a follow-up.

### Privacy

- **Git email no longer collected** (F-03). Identity is `install_id`-only. Existing tenants will see a one-time identity rotation; `repo_url_hash` continues to scope events to a project. Schema bumped to `1.0.5` (covers the `FANCYSAUCE_TEAM`/`FANCYSAUCE_DISCLOSURE_NOTIFICATION` removal, the new `stop_reason` attribute, and the `tool_call.complete` field corrections below).

### Features

- **`api.request` carries `stop_reason`.** When a turn finalizes (`end_turn`, `tool_use`, `max_tokens`, `refusal`, `stop_sequence`), the assistant message's `stop_reason` is forwarded as a string attribute on `api.request`. Per-message; absent when not set. Lets the server distinguish finalized rows via `WHERE stop_reason IS NOT NULL` instead of denormalized heuristics.

### Fixes

- **`tool_call.complete` `success` and `duration_ms` are now correct.** Through 0.4.3, every `tool_call.complete` shipped `success=false` and `duration_ms=0` because the event-mapper never extracted these fields and the content-filter silently defaulted them. The mapper now stamps `success=true` for `PostToolUse` (failures route to `PostToolUseFailure → tool_call.failed`, which never carried these fields). `duration_ms` is dropped from the wire — CC's `PostToolUse` payload doesn't carry it, and the server can derive it more accurately from the `(tool_call.start.timestamp_ns, tool_call.complete.timestamp_ns)` pair joined on `correlation_id`.

### Breaking

- **Removed runtime env-var knobs.** `FANCYSAUCE_SHIP_REPO_URL`, `FANCYSAUCE_IMPORT_HISTORY`, `FANCYSAUCE_IMPORT_HISTORY_SINCE`, `FANCYSAUCE_ENDPOINT`, `FANCYSAUCE_TEAM`, and `FANCYSAUCE_DISCLOSURE_NOTIFICATION` are no longer honored. The only env var the hook reads is `FANCYSAUCE_API_KEY`. Build-time `--endpoint <url>` (passed to `package-plugin.mjs`) is the supported path for non-default ingest URLs. Tenants who set any of the removed env vars will see no warning — they are silently ignored under the closed-schema policy.

### Build

- **Production ingest endpoint is `https://ingest.preview.fancysauce.ai`.** A short-lived intermediate commit on `feat/v0.4.4-audit-response` shipped `https://ingest.fancysauce.ai`; the final v0.4.4 artifact ships the preview URL. Cross-file consistency tests now guard against future drift between `config.mts`, `package-plugin.mjs`, and `publish-dist.mjs`.

### Backend coordination required

- The rendered marketplace.json's plugin `source` block now requires both `ref` (human-readable tag) and `sha` (40-hex cryptographic pin). CC validates the SHA against the cloned ref at install — a force-moved tag is detected.

## v0.4.3 — 2026-05-05

### Fixes

- fix(team): backoff invalidation on config change. Previously, when the backend changed the rendered marketplace's `--endpoint` or `--api-key`, an existing accumulated backoff (e.g., `transientAttempts: 20` → next retry hours away) would keep applying to the new config. Events queued against the old endpoint stayed stranded for hours after the fix was deployed. The forwarder now stamps the (api_key, endpoint) fingerprint on `backoff.json` and on each flush:
  - **API key change** → drop queued events (different tenant) + reset backoff.
  - **Endpoint change only** → retain queued events (same tenant, new ingest URL) + reset backoff so retries re-engage immediately against the new endpoint.
  - **No change** → no-op.

## v0.4.2 — 2026-04-30

### Fixes

- fix(release): drop `dist/team/hooks/hooks.json` from the published artifact. It was a build-time copy not used by the runtime (the bundled `collect.mjs` is what fires; the JSON next to it isn't read), but Claude Code's plugin display picked it up and rendered it as a stray `[object Object]` entry alongside the marketplace's hook events.

## v0.4.1 — 2026-04-30

### Fixes

- fix(release): drop `.claude-plugin/plugin.json` from the published artifact. v0.4.0 shipped a metadata-only plugin.json which Claude Code rejects under `strict: false` with "conflicting manifests: both plugin.json and marketplace entry specify components" — even though the plugin.json declared zero components. Empirically verified against Claude Code 2.1.123. The marketplace entry's `name` and `version` carry plugin identity now.

## v0.4.0 — 2026-04-30

### Features

- feat(team): per-tenant URL marketplace install flow — eliminates the managed-settings `env` block by serving a per-tenant `marketplace.json` from the dashboard backend with the API key + endpoint inlined into the hook command args. See [`docs/plans/2026-04-29-per-tenant-url-marketplace-design.md`](https://github.com/FancysauceAI/fancytab/blob/main/docs/plans/2026-04-29-per-tenant-url-marketplace-design.md).
- feat(team): `loadConfig` reads `--api-key` / `--endpoint` from argv (env vars remain as a fallback for backward compatibility).

### Build

- build(release): drop `hooks/hooks.json` and `.claude-plugin/marketplace.json` from the published artifact; the URL marketplace declares hooks inline with `strict: false`.

### Documentation

- docs(release): rewrite README install instructions for the URL-marketplace flow.

## v0.3.0 — 2026-04-28

### Features

- feat(team): v1 implementation + release tooling for v0.3.0 publish (#17)
- feat: automate marketplace branch publishing
- feat: point marketplace source at release branch
- feat: add marketplace.json and extend plugin.json metadata
- feat: forwarder gains jitter, Retry-After, and opt-in gzip
- feat: width-aware statusline with countdown rate limits
- feat: per-file monotonic seq in RawOtlpWriter
- feat: leader/follower roles in server bootstrap
- feat: leader election via atomic lockfile with stale-PID recovery
- feat: config file-watcher wakes forward worker on destination change
- feat: wire forward worker into server; remove standalone otlp-forwarder
- feat: forward worker lifecycle with wake coalescing and safety timer
- feat: forward worker sweep with watermark + backoff
- feat: forward-state with per-destination × per-stream watermarks
- feat: retention eviction for raw-OTLP (30-day default)
- feat: gzip raw-OTLP files on day rotation and startup recovery
- feat: durable-ack on OTLP inbound via raw-OTLP writer
- feat: raw-OTLP writer with UTC day rotation
- feat: raw-OTLP capture line format
- feat: protobuf OTLP inbound via content-type dispatch
- feat: OTLP protobuf decode adapter via bufbuild/protobuf
- feat: countdown clock, usage label, and per-session status tracking
- feat: register Node.js status line in plugin settings, remove bash script
- feat: add main status line entry point
- feat: add layout engine to assemble status line segments
- feat: add status line segment functions
- feat: add segment functions for statusline display units
- feat: add velocity cache for rate tracking across invocations
- feat: add statusline types, ANSI color utility, and config loader
- feat: add cost apportioner sink
- feat: retro skill dispatches Haiku subagent with summary data
- feat: add context tracker stateful transform
- feat: register file activity transform in session-manager and dispatcher
- feat: add cache expiry stateful transform
- feat: add file activity stateless transform
- feat: add StatefulTransformDefinition type and runStatefulPipeline
- feat: wire OTLP forwarder into HTTP listener
- feat: add OTLP forwarder for downstream destinations
- feat: add config loader for otel.forward destinations
- feat: register MCP server in plugin manifest
- feat: MCP server entry point wires all channels
- feat: session manager coordinates in-memory event processing
- feat: OTLP JSON mapper converts logs to api.request events
- feat: HTTP listener for OTLP JSON reception
- feat: Unix socket listener for hook event reception
- feat: MCP stdio handler for zero-tool server
- feat: hook dispatcher tries MCP bridge before fallback
- feat: bridge client for hook-to-MCP-server forwarding
- feat: build verification and plugin structure complete
- feat: skills and status line script
- feat: hook dispatcher wires event mapper, pipeline, and sinks
- feat: session index updater maintains cross-session index
- feat: summary updater sink with gap detection and self-healing
- feat: collector manages session state and JSONL event log
- feat: context transform tracks files entering context window
- feat: cache transform extracts cache efficiency snapshots
- feat: cost transform annotates API requests with derived metrics
- feat: model transform tracks model observations
- feat: git transform detects commits, pushes, branches, PRs
- feat: transform pipeline with middleware chain and sequence numbering
- feat: event mapper converts hook input to FancysauceEvent
- feat: type definitions and test fixtures
- feat: project scaffolding with TypeScript, Vitest, and plugin manifest

### Fixes

- fix(test): build before vitest run so e2e dist artifact exists
- fix: replace fs.watch with fs.watchFile polling for rename resilience
- fix: bootId + /health probe defeats PID-reuse in leader election
- fix: serialize ForwardState.persist to avoid tmp-file races
- fix: compound (ts, seq) watermark prevents same-ms data loss
- fix: use single stdout write for multi-line status line
- fix: add process error handlers and crash log to MCP server
- fix: deduplicate ForwardDestination type, extract bodyText variable
- fix: resolve existing ESLint violations
- fix: status line shows clock time for cache expiry, I/O tokens
- fix: status line cache countdown and hit rate display
- fix: cache hit rate formula, status line data dir discovery
- fix: cache hit rate uses total input as denominator
- fix: handle stringValue for numeric OTLP attributes
- fix: OTLP attribute names match Claude Code's actual format
- fix: single-source sequencing for OTel events, version bump to 0.2.0
- fix: guard BigInt conversion, explicit callback error handling
- fix: replace setTimeout with listen callback in bridge test
- fix: bridge review — clear timeout on success, remove fake timeout test
- fix: plugin hook registration — auto-discover, valid event names, node prefix
- fix: add shebang and node prefix so hook scripts execute correctly
- fix: dispatcher review — fileURLToPath guard, error-safe state
- fix: typecheck errors, unused import, gap detection comment
- fix: context transform deep-copies largest_file in coalesce
- fix: git transform review — add derived_from, git switch detection, extra tests
- fix: event mapper review — remove dead branch, forward hook fields, add tests

### Documentation

- docs: mark PR2 as no-op — PR1 already deletes pre-team-v1 code
- docs: team v1 release implementation plan
- docs: team v1 release design — distribution and iteration
- docs: team v1 Phase 3 implementation plan (M5 transcript-tail + M6 orchestrator)
- docs: team v1 Phase 2 implementation plan (M2 capture + M3 persistence + M4 identity)
- docs: team v1 Phase 1 implementation plan (M0 spike + M1 scaffold)
- docs: team v1 Milestone B design + OTLP ingest contract
- docs: team-deployment vision and architecture for v1
- docs: statusline width-aware rendering and countdown design
- docs: phase A.0 review fixes plan
- docs: update backlog and design with A.0 outcomes
- docs: split Task 4 into 4a/4b/4c using @bufbuild/protobuf
- docs: multi-session spike findings — leader election required
- docs: phase A.0 foundation implementation plan
- docs: phase A marketplace onboarding design
- docs: add OTLP forwarding implementation plan
- docs: add pre-commit hooks implementation plan
