# What the fancysauce-savings plugin sends

Generated from the plugin's content-filter keep-lists (`dist/shared/policy.mjs`) for version 0.18.1. Hooks receive the full tool input and prompt; the plugin emits only the fields below. Anything not listed is dropped before it is written to disk.

Kinds: **hash** is an unsalted SHA-256 of the named value, used to correlate equal values across events, not to conceal them: a short or guessable input can be recovered by guessing. **count** and **numeric** are numbers. **categorical** is one of a small fixed set of vendor-defined values. **scalar** is a short vendor-supplied value forwarded as text: a number, a version, or an enum token, never prose. **identifier** is an opaque id assigned by Claude Code or the API. **timestamp** is a point in time. **text** is marked explicitly and explained.

## Sent with every batch

| Attribute | Kind | What it is |
|---|---|---|
| `service.name` | categorical | Always `fancysauce`. |
| `service.version` | scalar | Plugin version. |
| `fancysauce.schema_version` | scalar | Wire schema version. |
| `fancysauce.install_id` | identifier | Random id generated on the machine at first run. |
| `fancysauce.agent` | categorical | `claude-code` or `codex-cli`. |
| `fancysauce.runtime` | categorical | Which collector build sent the batch: `node` or `go`. Fixed at build time, not read from the machine. |
| `os.type` | categorical | Operating system family (`darwin`, `linux`, `windows`), from the process platform. |
| `host.arch` | categorical | CPU architecture of the machine, from OpenTelemetry's `host.arch` enum: `amd64`, `arm32`, `arm64`, `ia64`, `ppc32`, `ppc64`, `s390x` or `x86`. Absent when the machine's architecture has no value in that enum. |
| `fancysauce.harness_entrypoint` | categorical | How Claude Code was launched, copied (truncated) from the `CLAUDE_CODE_ENTRYPOINT` environment variable Claude Code sets for its hooks. Absent when unset, and never sent by the history backfill. |
| `fancysauce.user.identity_source` | categorical | Which attribution tier resolved: `mdm_file`, `plugin_login`, `native_claude`, `native_codex`, `dscl`, `whoami_upn`, or `git_config`. Absent when none did. |
| `fancysauce.secure_envelope` | text | The identity record, encrypted to the fancysauce service key. Present only when a tier resolved and a real service key is available. Inside it: the tier name and whichever of email, UPN, account id, user id, organization id, organization name, plan, and git config scope that tier supplied. |

## Sent with every event

| Field | Kind | What it is |
|---|---|---|
| `fancysauce.event_uuid` | identifier | Random id for the event, the server's idempotency key. |
| `fancysauce.event_type` | categorical | The event type, one of the sections below. |
| `fancysauce.session_id` | identifier | Claude Code's session id. |
| `fancysauce.source` | categorical | Which hook or transcript read produced the event. |
| `fancysauce.sequence` | count | Position of the event within one hook fire. |
| `timeUnixNano` | timestamp | When the event happened. |
| `observedTimeUnixNano` | timestamp | When the batch was encoded for upload. |

## `session.start`

Source: hook `SessionStart`. A Claude Code session began.

| Attribute | Kind | What it is |
|---|---|---|
| `cwd_hash` | hash | SHA-256 of the working directory path. The path itself is not sent. |
| `model` | categorical | Model identifier, as Claude Code reports it. |
| `permission_mode` | categorical | Claude Code permission mode for the session. |
| `fancysauce.repo_url_hash` | hash | SHA-256 of the git remote URL of the working directory, when it is a git checkout. |

## `session.end`

Source: hook `SessionEnd`. A session ended.

| Attribute | Kind | What it is |
|---|---|---|
| `reason` | categorical | Session end reason, as Claude Code reports it. |
| `duration_wall_s` | count | Wall-clock seconds from session start to session end. |

## `prompt.submit`

Source: hook `UserPromptSubmit`. The user submitted a prompt.

| Attribute | Kind | What it is |
|---|---|---|
| `prompt_length` | count | Byte length of the prompt. The prompt text is not sent. |
| `slash_command` | identifier | The leading `/command` token of the prompt, letters, digits, `_`, `:` and `-` only, at most 64 characters. Absent when the prompt does not start with one. |

## `tool_call.start`

Source: hook `PreToolUse`. Claude Code is about to run a tool.

| Attribute | Kind | What it is |
|---|---|---|
| `tool_name` | categorical | Claude Code tool name. |
| `tool_input_hash` | hash | SHA-256 of the tool input serialized as canonical JSON. The input is not sent. |
| `input_size_bytes` | count | Byte length of the serialized tool input. |
| `correlation_id` | identifier | Claude Code's id for the tool call, to pair start with completion. |
| `subsession_id` | identifier | Claude Code's id for the subagent the tool ran in, when it ran in one. |
| `agent_type` | categorical | Subagent type name. |
| `skill_name` | identifier | Skill name, when the tool was the Skill tool. The skill's arguments are not sent. |

## `tool_call.complete`

Source: hook `PostToolUse`. A tool call succeeded.

| Attribute | Kind | What it is |
|---|---|---|
| `tool_name` | categorical | Claude Code tool name. |
| `tool_input_hash` | hash | SHA-256 of the tool input serialized as canonical JSON. The input is not sent. |
| `input_size_bytes` | count | Byte length of the serialized tool input. |
| `response_size_bytes` | count | Byte length of the serialized tool output. The output is not sent. |
| `success` | boolean | Always true on this event; failures are a separate event. |
| `correlation_id` | identifier | Claude Code's id for the tool call, to pair start with completion. |
| `subsession_id` | identifier | Claude Code's id for the subagent the tool ran in, when it ran in one. |
| `agent_type` | categorical | Subagent type name. |
| `skill_name` | identifier | Skill name, when the tool was the Skill tool. The skill's arguments are not sent. |
| `ref_system` | categorical | Reference system, e.g. `github`. Only when the workspace has enabled reference capture. |
| `ref_kind` | categorical | Reference kind, e.g. `pull_request`. Same condition. |
| `ref_id` | identifier | Reference id, e.g. a pull request number. Same condition. |
| `ref_scope` | identifier | Reference scope, e.g. `owner/repo`. Same condition. |
| `ref_source` | categorical | Which tool output the reference was found in. Same condition. |

## `tool_call.failed`

Source: hook `PostToolUseFailure`. A tool call failed.

| Attribute | Kind | What it is |
|---|---|---|
| `tool_name` | categorical | Claude Code tool name. |
| `tool_input_hash` | hash | SHA-256 of the tool input serialized as canonical JSON. The input is not sent. |
| `correlation_id` | identifier | Claude Code's id for the tool call, to pair start with completion. |
| `subsession_id` | identifier | Claude Code's id for the subagent the tool ran in, when it ran in one. |
| `agent_type` | categorical | Subagent type name. |
| `skill_name` | identifier | Skill name, when the tool was the Skill tool. The skill's arguments are not sent. |

## `subagent.start`

Source: hook `SubagentStart`. A subagent was launched.

| Attribute | Kind | What it is |
|---|---|---|
| `agent_id` | identifier | Claude Code's id for the subagent. |
| `agent_type` | categorical | Subagent type name. |

## `subagent.complete`

Source: hook `SubagentStop`. A subagent finished.

| Attribute | Kind | What it is |
|---|---|---|
| `agent_id` | identifier | Claude Code's id for the subagent. |
| `agent_type` | categorical | Subagent type name. |
| `duration_wall_s` | count | Seconds between the first and last record of the subagent's transcript. |
| `last_assistant_message_size_bytes` | count | Byte length of the subagent's final message. The message is not sent. |
| `last_assistant_message_hash` | hash | SHA-256 of the subagent's final message. |

## `stop`

Source: hook `Stop`. The assistant finished a turn.

No attributes. The event carries only its type, session id, sequence and timestamp.

## `permission.request`

Source: hook `PermissionRequest`. Claude Code asked the user for permission.

No attributes. The event carries only its type, session id, sequence and timestamp.

## `notification`

Source: hook `Notification`. Claude Code showed a notification.

| Attribute | Kind | What it is |
|---|---|---|
| `notification_type` | categorical | Claude Code notification type. |
| `quota_type` | categorical | Which usage quota a quota notification refers to. |
| `reset_time` | timestamp | When the quota resets, as Claude Code reports it. |
| `original_reset_time` | timestamp | The original reset time, when Claude Code reports one. |

## `task.completed`

Source: hook `TaskCompleted`. A background task completed.

| Attribute | Kind | What it is |
|---|---|---|
| `task_id` | identifier | Claude Code's id for the background task. |

## `compaction.before`

Source: hook `PreCompact`. Context compaction is about to run.

No attributes. The event carries only its type, session id, sequence and timestamp.

## `compaction.after`

Source: hook `PostCompact`. Context compaction finished.

No attributes. The event carries only its type, session id, sequence and timestamp.

## `config.changed`

Source: hook `ConfigChange`. Claude Code's configuration changed.

No attributes. The event carries only its type, session id, sequence and timestamp.

## `api.request`

Source: transcript tail. One model request, read from the session transcript Claude Code writes locally.

| Attribute | Kind | What it is |
|---|---|---|
| `cost_usd` | numeric | Claude Code's own cost estimate for the request. |
| `tokens_input` | count | Input tokens. |
| `tokens_output` | count | Output tokens. |
| `tokens_cache_read` | count | Prompt-cache read tokens. |
| `tokens_cache_create` | count | Prompt-cache write tokens. |
| `tokens_cache_create_5m` | count | Prompt-cache write tokens, five-minute tier. |
| `tokens_cache_create_1h` | count | Prompt-cache write tokens, one-hour tier. |
| `tokens_reasoning` | count | Reasoning tokens, when reported. |
| `model` | categorical | Model identifier, as Claude Code reports it. |
| `request_id` | identifier | Anthropic API request id. |
| `transcript_message_uuid` | identifier | Claude Code's id for the transcript record. |
| `subsession_id` | identifier | Claude Code's id for the subagent the tool ran in, when it ran in one. |
| `agent_type` | categorical | Subagent type name. |
| `stop_reason` | categorical | API stop reason. |
| `primary_used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `primary_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `primary_window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `speed` | categorical | `standard` or `fast`. |
| `api_error` | boolean | Whether the request failed. |
| `api_error_kind` | categorical | Failure class token, letters, digits and `_` only. |
| `api_error_status` | numeric | HTTP status of a failed request. |
| `reached_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `plan_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_has` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_unlimited` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_limit` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_remaining_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `service_tier_requested` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `service_tier_observed` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `limit_id` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |

## `usage_limit.exceeded`

Source: transcript tail or hook `StopFailure`. Claude Code reported that a usage limit was reached.

| Attribute | Kind | What it is |
|---|---|---|
| `limit_message` | text | The limit notice Claude Code displayed, verbatim. This is vendor text, not user content. |
| `limit_kind_guess` | categorical | The plugin's classification of the notice; the service re-derives it. |
| `reset_at_guess` | timestamp | The plugin's parse of the reset time in the notice. |
| `error_type` | categorical | Claude Code's failure class for the turn. |
| `retry_after_seconds` | count | Retry hint from Claude Code, 0 to 86400. |
| `api_error_status` | numeric | HTTP status of a failed request. |
| `request_id` | identifier | Anthropic API request id. |
| `transcript_message_uuid` | identifier | Claude Code's id for the transcript record. |
| `plan_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `seat_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `rate_limit_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `billing_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_enabled` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_disabled_reason` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `window` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `reached_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `limit_source` | categorical | Where the limit signal came from. |
| `last_reached_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `limit_id` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_has` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_unlimited` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_balance` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_limit` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_remaining_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `fast_available` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `fast_default` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `config_service_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `cli_version` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |

## `usage_limit.snapshot`

Source: usage probe. A reading of the account's usage windows from Claude Code's local cache.

| Attribute | Kind | What it is |
|---|---|---|
| `window` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `primary_used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `primary_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `primary_window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_used_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `secondary_window_minutes` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `plan_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `seat_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `model` | categorical | Model identifier, as Claude Code reports it. |
| `limit_id` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |

## `usage_config.changed`

Source: usage probe. The account's plan or limit configuration changed, from Claude Code's local cache.

| Attribute | Kind | What it is |
|---|---|---|
| `plan_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `seat_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `rate_limit_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `billing_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_enabled` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_disabled_reason` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `overage_credit_available` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `overage_credit_eligible` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_has` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_unlimited` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_balance` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `auth_plan_claim` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `last_reached_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_limit` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_resets_at` | timestamp | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_control_remaining_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `fast_available` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `fast_default` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `config_service_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `cli_version` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |

## `usage_spend.snapshot`

Source: usage probe. A reading of the account's extra-usage spend from Claude Code's local cache.

| Attribute | Kind | What it is |
|---|---|---|
| `spend_used_minor` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_currency` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_limit_minor` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_percent` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_enabled` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_disabled_reason` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `spend_limit_reached` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_enabled` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_disabled_reason` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_monthly_limit` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_used_credits` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `extra_usage_utilization` | numeric | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `credits_ever_enabled` | boolean | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `plan_type` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |
| `seat_tier` | scalar | Account or plan setting copied from Claude Code's local configuration cache. Never free text. |

## Never sent

- Prompt text, tool inputs, tool outputs, or assistant messages.
- File contents, file paths, or the working directory path.
- Transcript text. Only the per-request accounting fields above are read from it.
- Environment variables, except the plugin's own configuration variables and `CLAUDE_CODE_ENTRYPOINT`, which is sent as `fancysauce.harness_entrypoint`.
- The identity record in the clear. It travels only inside `fancysauce.secure_envelope`.
