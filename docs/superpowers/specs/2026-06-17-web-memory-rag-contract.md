# Web Memory/RAG Contract

## 목표

Web chat이 App과 같은 `cloud_memories` 원장을 사용해 continuity를 유지한다. Web은 app local private memory를 볼 수 없고, raw desktop context를 요청하지 않는다.

## Source Of Truth

```text
Supabase cloud_memories
  -> deterministic list
  -> match_cloud_memories vector retrieval
  -> Web prompt memory envelope
```

사실:

- `cloud_memories`는 user-owned Supabase table이다.
- `match_cloud_memories(...)` RPC는 persona, memory type, embedding model, threshold, count를 입력으로 받는다.
- App은 safe conversation summary를 `sync_queue`를 통해 `cloud_memories`로 올릴 수 있다.

## Web Route Responsibilities

Web Route Handler 또는 Server Function은 아래 순서를 따른다.

```text
verify Supabase session
  -> load selected persona
  -> load recent cloud_memories
  -> optionally call match_cloud_memories
  -> build prompt memory envelope
  -> call cloud LLM with server-side provider key
  -> write assistant cloud_conversation_messages
```

Browser가 직접 해야 하는 것:

- authenticated request 전송
- optimistic UI render
- returned cloud message render

Browser가 직접 하면 안 되는 것:

- provider API key 보유
- service role key 보유
- raw desktop context 업로드
- `local_private` memory 요청

## Suggested API

```text
GET  /api/memories?personaId=<uuid-or-slug>
POST /api/rag/match
POST /api/conversations/:id/reply
```

### `GET /api/memories`

Response:

```json
{
  "memories": [
    {
      "id": "memory-uuid",
      "personaId": "persona-uuid",
      "memoryCategory": "semantic",
      "memoryType": "user_preference",
      "content": "사용자는 짧은 답변을 선호한다.",
      "confidence": 90,
      "source": "conversation",
      "visibility": "cloud_safe",
      "updatedAt": "2026-06-17T00:00:00.000Z"
    }
  ]
}
```

Rules:

- returns current user's rows only by RLS.
- excludes `deleted_at`.
- excludes expired rows.
- caps result count.

### `POST /api/rag/match`

Request:

```json
{
  "personaId": "persona-uuid",
  "query": "사용자 질문 또는 최근 대화 요약",
  "memoryTypes": ["user_preference", "episodic_summary"],
  "limit": 8
}
```

Server behavior:

- generate query embedding server-side.
- call `match_cloud_memories`.
- fallback to deterministic `cloud_memories` list if embedding or RPC fails.
- return cloud-safe memory only.

### `POST /api/conversations/:id/reply`

Server behavior:

```text
load conversation messages
  -> build RAG query from recent messages
  -> retrieve cloud memories
  -> build prompt envelope
  -> call LLM
  -> upsert assistant cloud message
```

## Prompt Memory Envelope

Web prompt memory input must be structured:

```json
{
  "semanticMemories": [
    {
      "id": "memory-uuid",
      "content": "사용자는 짧은 답변을 선호한다.",
      "confidence": 90,
      "scope": "cloud_safe"
    }
  ],
  "episodicContext": [
    {
      "id": "memory-uuid",
      "summary": "최근 대화에서 사용자는 답변 길이를 조정해달라고 했다.",
      "createdAtMs": 1797398400000,
      "scope": "cloud_safe"
    }
  ],
  "proceduralNotes": []
}
```

Rules:

- Web envelope scope must be `cloud_safe`.
- Web must not include `local_private` or `syncable_summary` cards.
- Web must not include raw source text beyond redacted evidence already accepted in `cloud_memories`.

## Forbidden Payload Fields

Reject request payloads or memory candidate payloads containing:

- `rawOcrText`
- `screenshotPath`
- `windowTitle`
- `filePath`
- `fullUrl`
- `accessToken`
- `refreshToken`
- `apiKey`
- `token=`
- `/Users/`
- URL query strings

## Failure Behavior

- Memory retrieval failure must not fail chat.
- Vector search failure falls back to deterministic memory list.
- No memory produces an empty memory envelope.
- RLS failure returns 401/403 and does not reveal whether another user's row exists.

## Tests

Required Web tests:

- User A cannot retrieve User B memories.
- Web route never returns `local_private` memory.
- Forbidden raw fields are rejected before prompt assembly.
- Vector failure falls back to deterministic memory.
- Provider key is never exposed to browser response.
- Web reply prompt includes only cloud-safe memory.

## Non-Goals

- Web local memory.
- Desktop raw context sync.
- Browser-side embedding generation with provider keys.
- Service-role ordinary memory reads.
