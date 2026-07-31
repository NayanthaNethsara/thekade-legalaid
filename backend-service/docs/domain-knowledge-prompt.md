# Domain Knowledge Prompt

Source of truth for the taxonomy the agent searches over. Kept as a document so
it can be reviewed and edited without touching Python, then pasted into
`DOMAIN_KNOWLEDGE_PROMPT` in `app/orchestrator/prompts.py`.

## Where it is used

- **`DOMAIN_KNOWLEDGE_PROMPT`** (`app/orchestrator/prompts.py`) — injected into
  `SEARCH_TOOL_PROMPT`, so the search agent phrases queries from real terms
  instead of inventing them.
- **`DOMAIN_GROUNDING`** (`app/orchestrator/guardrail_policy.py`) — a shorter,
  prose version of the same remit. The scope classifier uses it to decide
  `IN_SCOPE` vs `OUT_OF_SCOPE`, and the image-search prompt uses it as a wording
  hint. Keep the two in sync: anything the agent can search for must also be in
  scope, or the guardrail will block requests the tools could have answered.

## Format

Two levels, no deeper. The top level is what a user would recognize as an area;
the second level is the concrete terms the search tool actually matches. Both
levels are read by an LLM, so use the words real users use, not internal
category codes.

```
Domain coverage:
- <Top-level area>
  * <specific term>, <specific term>, <specific term>
- <Top-level area>
  * <specific term>, <specific term>, <specific term>
```

## Guidance

- Prefer the user's vocabulary over internal naming. If people say one thing and
  the database says another, list both.
- Keep it to the areas that are genuinely covered. Listing something the tools
  cannot retrieve makes the agent promise answers it cannot ground.
- Note real exclusions explicitly. "In scope" is defined by this list, so an
  unlisted area silently becomes out of scope.
- Watch the length. This text ships on every search-agent call, so it is a
  recurring token cost. Group aggressively rather than enumerating every leaf.

## Current content

Placeholder. Replace the whole block below, then mirror it into
`DOMAIN_KNOWLEDGE_PROMPT`.

```
Domain coverage:
- Topic area A
  * subtopic, subtopic, subtopic
- Topic area B
  * subtopic, subtopic, subtopic
- Topic area C
  * subtopic, subtopic, subtopic
```
