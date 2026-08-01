# Backend API Requirements — kakille-web

What `kakille-web` needs from `backend-service` to have every button and panel
backed by a real endpoint, not local state. Derived from a full audit of the
frontend (every server action, API route, and UI control) against the routes
`backend-service` already exposes.

Status legend: ✅ exists and wired · 🟡 exists, needs extending · ⛔ missing,
needs building.

All new endpoints below follow the conventions already used by `/chat` and
`/cart`: mounted under `app/api/routes/`, guarded by the existing
`require_internal_key` + `get_principal` dependencies, and scoped per
principal + conversation with the same `{kind}:{id}:{conversation_id}` key
pattern used in `chat.py:_thread_id` and `cart.py:_cart_key`. `conversation_id`
follows the same `^[A-Za-z0-9_-]+$`, 1–64 char pattern as `ChatRequest`, and
already accepts the frontend's `"global"` sentinel for studio items created
outside a conversation.

## Summary

| Feature area | Status | Endpoints needed |
| --- | --- | --- |
| Chat (send, stream, history) | ✅ | none |
| Image search | ✅ | none |
| Auth (Google, refresh, me) | ✅ | none |
| Guest session | ✅ | none |
| Profile (get/update/clear memory) | ✅ | none |
| Quick-start prompts | 🟡 mocked client-side | `GET /chat/quick-messages` |
| Chat context from selected sources | 🟡 selection is cosmetic today | extend `ChatRequest` with `source_ids` |
| Sources (upload, link, text, list, select, delete) | ⛔ | `POST /sources/upload`, `POST /sources/link`, `POST /sources/text`, `GET /sources`, `PATCH /sources/{id}`, `PATCH /sources/select-all`, `DELETE /sources/{id}` |
| Notes | ⛔ | `GET /notes`, `POST /notes`, `PUT /notes/{id}`, `DELETE /notes/{id}` |
| Reminders | ⛔ | `GET /reminders`, `POST /reminders`, `PATCH /reminders/{id}`, `DELETE /reminders/{id}` |
| Studio generation tiles (Case Summary, Legal Research, Document Draft, Timeline, Mind Map, Report, Flashcards) | 🟡 works as a plain chat turn today | `POST /studio/generate`, `GET /studio/outputs` |
| Audio Overview tile | ⛔ (needs TTS) | `POST /studio/generate` with `type: "audio_overview"` + a TTS provider |
| Cart (`/cart/*`) | ✅ implemented, unused | not part of this redesign — see Note below |

**Note on cart:** `backend-service` already fully implements `/cart` and
`/cart/items` (`app/api/routes/cart.py`), but nothing in `kakille-web` calls
them anymore since the commerce UI was removed. Leave as-is or remove in a
separate cleanup — out of scope here.

---

## 1. Chat — ✅ fully wired

No changes needed. For reference, since new endpoints below follow its shape:

| Frontend trigger | Endpoint |
| --- | --- |
| Composer submit → `streamChatMessage` (`lib/chat/stream.ts`) | `POST /chat/stream` via `app/api/chat/stream/route.ts` proxy |
| `ChatShell.handleDelete` (`chat-shell.tsx`) | `DELETE /chat?conversation_id=` |
| Sidebar mount / route change → `fetchConversationList` | `GET /chat/conversations` |
| Opening a conversation → `fetchConversationDetail` | `GET /chat/conversations/{id}` |
| Composer image button → `ImageSearchDialog` | `POST /chat/image-search` via `app/api/chat/image-search/route.ts` |

### 1a. Quick-start prompts — 🟡 mocked

`fetchQuickMessages()` (`lib/chat/actions.ts:109-136`) has an explicit
`// TODO: Switch this to a real backend endpoint call` and currently returns
hardcoded prompts client-side.

```
GET /chat/quick-messages
→ 200: QuickMessageItem[]

QuickMessageItem:
  icon_name: str        # maps to a lucide icon on the client
  label: str
  message: str           # the prompt text sent when the chip is tapped
```

No auth beyond the existing internal-key gate; content can be static config
on the backend so copy changes don't need a frontend deploy.

### 1b. Source-aware chat — 🟡 selection is cosmetic

The Sources panel lets a user check/uncheck sources, and the composer shows
"N sources" (`chat-composer.tsx`), but neither `ChatRequest` nor the SSE
payload includes source ids — the LLM never actually sees selected sources.

```
ChatRequest (extend):
  message: str
  conversation_id: str
  is_ui: bool
  source_ids: list[str] = []   # NEW — ids of currently-selected Source rows
```

The orchestrator resolves `source_ids` → source content (via the new
`SourceRepository`, §3) and injects it into the prompt/context the same way
it would inject retrieved documents today.

---

## 2. Auth, Guest, Profile — ✅ fully wired

No changes needed; listed for completeness.

| Frontend trigger | Endpoint |
| --- | --- |
| "Continue with Google" (`login-dialog.tsx`) | `POST /auth/google` |
| Automatic token refresh (NextAuth `jwt` callback) | `POST /auth/refresh` |
| Session resolution | `GET /auth/me` |
| "Sign out" (sidebar dropdown / `logout-button.tsx`) | NextAuth `signOut` (no direct backend call) |
| Guest bootstrap (`proxy.ts` middleware) | `POST /guest` |
| Guest session check | `GET /guest/me` |
| Profile panel open → `getProfile()` | `GET /profile` |
| "Save changes" → `updateProfile()` | `PUT /profile` |
| "Clear" memory button → `clearMemory()` | `DELETE /profile/memory` |

**"Continue with Apple"** (`login-dialog.tsx`) is rendered disabled/"(Soon)" —
no endpoint needed until it's built.

**Minor inconsistency to fix, not a new endpoint:** the guest name/color shown
in the sidebar comes from a client-side mock generator
(`generateGuestSessionInfo()`, `lib/chat/actions.ts:143-166`) cached in
`sessionStorage`, not from `GET /guest/me`'s real `display_name`. Either make
`POST /guest` assign the display name+color server-side (extend
`GuestResponse` with a `color` field) and have the frontend stop overriding
it, or keep the mock and drop the unused server round-trip — pick one so the
two aren't fighting.

---

## 3. Sources — ⛔ needs building

Backing store today: `components/studio/workspace-store.tsx` →
`useLocalCollection("kakille.sources")` — pure `localStorage`, nothing sent
anywhere. File bytes and pasted text aren't even kept in the local record
today (only `name`/`size`/`type`), so this is the biggest gap.

```
Source:
  id: str
  conversation_id: str
  kind: "file" | "website" | "youtube" | "text"
  name: str
  size: int
  content_type: str
  url: str | None            # website/youtube only
  is_selected: bool
  added_at: datetime

POST /sources/upload   (multipart: file, conversation_id)
  → 201: Source
  # Stores the file (object storage/blob column), extracts text (PDF/doc
  # parsing) for later retrieval. Triggered by: "Add source" → dropzone /
  # "Upload files" chip (add-source-dialog.tsx).

POST /sources/link      { conversation_id, url }
  → 201: Source
  # kind resolved server-side (youtube.com/youtu.be → "youtube", else
  # "website"); fetches + extracts page text or video transcript.
  # Triggered by: URL input "Add" button (add-source-dialog.tsx).

POST /sources/text      { conversation_id, name?, content }
  → 201: Source
  # Triggered by: "Copied text" panel → "Add text" (add-source-dialog.tsx).

GET /sources?conversation_id=
  → 200: Source[]
  # Triggered by: Sources panel mount (chat-sidebar.tsx).

PATCH /sources/{id}     { is_selected? }
  → 200: Source
  # Triggered by: per-row checkbox toggle (chat-sidebar.tsx SourceCheckbox).

PATCH /sources/select-all   { conversation_id, is_selected }
  → 200: Source[]
  # Triggered by: "Select all sources" toggle (chat-sidebar.tsx).

DELETE /sources/{id}
  → 204
  # Triggered by: row "X" remove button (chat-sidebar.tsx).
```

Enforce the 300-source cap (`SOURCE_LIMIT` in `add-source-dialog.tsx`)
server-side too — the frontend constant is not authoritative on its own.

---

## 4. Notes — ⛔ needs building

Backing store today: `useWorkspace().notes` →
`useLocalCollection("kakille.notes")`, scoped by `conversation_id` (or the
`"global"` sentinel for notes made on the landing page). Pure `localStorage`.

```
Note:
  id: str
  conversation_id: str
  content: str
  updated_at: datetime

GET /notes?conversation_id=
  → 200: Note[]
  # Triggered by: Case Studio panel mount (studio-panel.tsx / notes-widget.tsx).

POST /notes    { conversation_id, content }
  → 201: Note
  # Triggered by: "+" button / Enter in the note composer (notes-widget.tsx).

PUT /notes/{id}   { content }
  → 200: Note
  # Triggered by: pencil → check (save edit) (notes-widget.tsx).

DELETE /notes/{id}
  → 204
  # Triggered by: trash icon (notes-widget.tsx).
```

---

## 5. Reminders — ⛔ needs building

Backing store today: `useWorkspace().reminders` →
`useLocalCollection("kakille.reminders")`, same scoping as Notes.

```
Reminder:
  id: str
  conversation_id: str
  title: str
  due_date: str | None   # ISO date, matches the <input type="date"> value
  is_done: bool

GET /reminders?conversation_id=
  → 200: Reminder[]
  # Triggered by: Case Studio panel mount (reminders-widget.tsx).

POST /reminders   { conversation_id, title, due_date? }
  → 201: Reminder
  # Triggered by: "+" button / Enter (reminders-widget.tsx).

PATCH /reminders/{id}   { is_done?, title?, due_date? }
  → 200: Reminder
  # Triggered by: done-circle toggle (reminders-widget.tsx).

DELETE /reminders/{id}
  → 204
  # Triggered by: trash icon (reminders-widget.tsx).
```

Overdue styling is a pure client-side date comparison today and stays that
way — no backend involvement needed for it. Actual notifications (push/email
when a reminder is due) are a separate, larger feature with no existing
infra in `backend-service`; out of scope for making the current UI's buttons
work, called out here only so it isn't assumed to be included.

---

## 6. Studio generation tiles — 🟡 works today, needs a real artifact layer

`components/studio/action-tiles.tsx` has 8 tiles (Audio Overview, Case
Summary, Legal Research, Document Draft, Timeline, Mind Map, Report,
Flashcards). Today every tile does the same thing: dispatch a canned prompt
string into the existing chat stream (`submit-chat-message` event →
`POST /chat/stream`). This already reaches a real backend and returns a real
reply — so the tiles are not "broken" — but the reply lands as an ordinary
chat bubble, not a persisted, typed Studio artifact. `StudioContent`'s empty
state ("Studio output will be saved here") implies the latter is the real
target.

```
StudioOutput:
  id: str
  conversation_id: str
  type: "audio_overview" | "case_summary" | "legal_research"
      | "document_draft" | "timeline" | "mind_map" | "report" | "flashcards"
  title: str
  created_at: datetime
  # Shape of `content` depends on `type`:
  content:
    text: str | None                 # case_summary, legal_research, document_draft, report
    timeline_events: TimelineEvent[] | None   # timeline
    mind_map: MindMapNode | None               # mind_map
    flashcards: Flashcard[] | None             # flashcards
    audio_url: str | None                      # audio_overview

TimelineEvent:  { date: str, label: str, description: str }
MindMapNode:    { label: str, children: MindMapNode[] }
Flashcard:      { question: str, answer: str }

POST /studio/generate    { conversation_id, type, source_ids? }
  → 201: StudioOutput
  # Runs the same orchestrator, but with a per-type prompt/parser so the
  # result is structured instead of freeform chat text, and persists it
  # instead of appending to chat history.
  # Triggered by: each action tile (action-tiles.tsx runPrompt()).

GET /studio/outputs?conversation_id=
  → 200: StudioOutput[]
  # Triggered by: Case Studio panel mount, to populate the output list that
  # currently has no real backing (studio-panel.tsx hasOutput check).
```

**Audio Overview specifically** needs a text-to-speech step with no existing
equivalent in `backend-service` — generate a script (per `content.text`),
synthesize it with a TTS provider, store the resulting audio, and return
`content.audio_url`. This is a larger infra addition (provider choice,
storage, playback UI) beyond adding a route; call this out separately when
scoping the Audio Overview tile specifically.

**Migration note:** until `/studio/generate` exists, the tiles can keep using
`/chat/stream` as they do today — that's a legitimate incremental step, not a
broken state. `/studio/generate` is what upgrades "chat message that happens
to answer the prompt" into "saved Studio artifact," matching the NotebookLM
model the UI now visually promises.
