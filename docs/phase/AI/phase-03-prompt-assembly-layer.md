# Phase 03. Prompt Assembly Layer

## Goal

Persona, memory, session, and current context are assembled into a stable LLM input format.

The Prompt Assembly Layer is the contract that keeps persona continuity across web and app.

## Prompt Envelope

```text
CompanionPromptEnvelope
- surface: web | app
- mode: nudge | pocket | deep
- locale
- persona_static
- character_scenario
- persona_state
- semantic_memories[]
- episodic_context[]
- session_messages[]
- current_context: SafeCurrentContext | LocalRedactedContext | null
- safety_contract
- output_contract
```

## Assembly Order

```text
SYSTEM
PERSONA STATIC
CHARACTER SCENARIO
PERSONA STATE
SEMANTIC MEMORY CARDS
EPISODIC CONTEXT
SESSION MESSAGES
CURRENT CONTEXT
OUTPUT CONTRACT
```

This order is intentionally fixed. Provider implementations may filter sections but must not reorder them.

Section mapping:

| Section | Source | Notes |
| --- | --- | --- |
| `PERSONA STATIC` | persona character card identity, backstory, speech style, boundaries | stable, versioned |
| `CHARACTER SCENARIO` | scenario, first message state, world lore, example dialogue style notes | first message is only used at conversation start |
| `PERSONA STATE` | dynamic relationship state | expires or updates independently |
| `SEMANTIC MEMORY CARDS` | durable memory cards | high confidence first |
| `EPISODIC CONTEXT` | recent session/event summaries | recency first |
| `SESSION MESSAGES` | ordered conversation messages | stable Phase 02 ordering |
| `CURRENT CONTEXT` | safe current context only | never raw desktop data |
| `OUTPUT CONTRACT` | mode-specific shape | provider-independent |

`procedural` memory belongs in persona, safety, or output sections. It must not be retrieved as ordinary semantic memory unless explicitly mapped.

## Mode Rules

### Nudge

- Max 1 sentence.
- No question unless trigger policy explicitly asks.
- Uses persona static and current safe context.
- Uses only high-confidence memory cards.
- Does not include full session history.
- Works without screen capture or OCR.
- May include only minimal `LocalRedactedContext` from Phase 08 when OCR was allowed after a trigger candidate.

### Pocket

- Max 2 short turns.
- Uses active nudge context.
- Uses recent episodic context.
- Does not force deep chat.
- May include `LocalRedactedContext` after the user opens the Nudge.

### Deep

- Can use longer conversation history.
- Uses semantic memory cards.
- Uses recent episodic summaries.
- May generate memory candidates after response, but not in the response path for MVP.
- May include richer `LocalRedactedContext` after user input.

## Token Budget

Budgets are initial contracts and must be tuned with Phase 07 measurements.

| Mode | Total input cap | Response cap | Memory cap | Session cap | Current context cap |
| --- | ---: | ---: | ---: | ---: | ---: |
| `nudge` | 1,200 tokens | 80 tokens | 250 tokens | 0 tokens | 250 tokens |
| `pocket` | 2,800 tokens | 300 tokens | 600 tokens | 900 tokens | 400 tokens |
| `deep` | 8,000 tokens | 900 tokens | 1,500 tokens | 3,000 tokens | 600 tokens |

Truncation priority:

```text
1. drop lowest confidence memory
2. drop oldest episodic context
3. summarize older session messages
4. reduce current context to title-free intent summary
5. fail closed if safety/persona/output sections would be removed
```

`persona_static`, `character_scenario`, `safety_contract`, and `output_contract` are required sections.

## Current Context Types

```text
SafeCurrentContext
- source: cloud_safe | user_visible
- summary
- allowed_surface: web | app | both
```

```text
LocalRedactedContext
- source: local_desktop
- summary
- trigger_type
- coarse_context_label
- confidence_bucket
- redaction_policy_version
- forbidden_keys_removed[]
```

Raw window titles, OCR text, screenshots, full URLs, file paths, secrets, and token-like strings must be rejected before the prompt envelope is created.

Phase 08 owns the OCR hydration rules that create `LocalRedactedContext`. Prompt Builder only consumes the already-redacted context and applies provider filtering.

## Provider Filtering

### Web Cloud LLM

Allowed:

- persona static
- character scenario
- cloud-safe persona state
- cloud-safe memory cards
- cloud conversation messages

Forbidden:

- raw desktop context
- OCR raw text
- OCR-derived local context
- screenshot
- local private memory

### App Local Qwen

Allowed:

- persona static
- character scenario
- persona state
- local private memory cards after policy filtering
- redacted desktop context
- OCR-derived `LocalRedactedContext` after Phase 08 gates
- conversation messages

Forbidden:

- raw OCR text
- screenshot
- passwords/tokens/full URLs/file paths
- OCR context when capture gates failed

## Scope

- Prompt envelope types.
- Prompt builder module.
- Provider-specific filtering.
- Prompt token budget.
- Existing Rust `LlmInputEnvelope` migration path.

## Excluded

- New memory extraction.
- RAG/vector search.
- Fine-tuning.

## Tests

- Same persona produces same static section on web and app.
- Cloud provider input never includes local-private data.
- Local Qwen input never includes forbidden raw fields.
- Nudge prompt includes no more than allowed memory count.
- Deep prompt preserves session order.
- Prompt builder enforces mode token budgets.
- `first_message` appears only at conversation start.
- `current_context` cannot be created from forbidden raw keys.
- Nudge prompt can be built without screen permission or OCR.
- Web Cloud LLM input strips OCR-derived local context.

## Exit Criteria

- Web and app use the same prompt envelope structure.
- Provider input differences are explicit and tested.
- Persona continuity no longer depends on ad hoc string summaries.
- Prompt assembly can explain why each memory/context item was included.
