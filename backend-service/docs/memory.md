# Memory Architecture and State Management

This document describes the design, implementation, and lifecycle of the three core state and memory paradigms used by the Kakille AI backend service.

---

## 1. Overview of the State Systems

The service maintains three tiers of state/memory to balance performance, consistency, and session lifetimes:

| System | Storage | Key Identifier | Lifecycle / TTL | Purpose |
| --- | --- | --- | --- | --- |
| **LangGraph Thread Saver** | PostgreSQL (relational checkpointer) | `thread_id` | Permanent (until manually deleted) | Short-to-medium-term conversation context, message list, and routing state for a single thread. |
| **Durable Customer Memory** | PostgreSQL (source of truth) + Redis (read cache) | `user_identity` | Permanent | Long-term cross-conversation preferences (e.g. favorite items, recipient details) and profile data (name, phone, addresses). |
| **Ephemeral Redis State** | Redis | Dynamic (e.g. `cart:`, `guest:`, `dedup:`, `mcp:`) | Ttl-based (ranges from seconds to 7 days) | Carts, guest sessions, NATS message deduplication, rate limits, and external MCP tool call caching. |

---

## 2. LangGraph Thread State and Checkpoint Saver

The agent is implemented as a state graph using LangGraph. Each message exchange with the user is evaluated within a graph run that processes and stores turn states.

### Mechanism
- **Implementation**: Managed by `AsyncPostgresSaver` and `AsyncPostgresStore` (configured in [service.py](../app/orchestrator/service.py)).
- **Scope**: Tied to a unique `thread_id` (a composite key of `principal_kind:principal_id:conversation_uuid` or a unique WhatsApp identifier).
- **State Schema**: Defined in [AgentState](../app/orchestrator/state.py), which extends LangGraph's standard `MessagesState`. It tracks:
  - `messages`: The list of conversational messages.
  - `rendered_turns`: An append-only list of sanitized exchanges seen by the user.
  - `channel`: Web or WhatsApp markup instructions.
  - State flags (e.g., `requires_memory_update`, `target_goal`, `plan`).

### Conversation Cleanup
At the end of a turn, the `finalize_turn` node runs a message pruning step ([finalize_turn.py](../app/orchestrator/nodes/finalize_turn.py#L113)):
- **Why**: Raw execution context (e.g. tool calls, tool response payloads, internal planning thoughts) contains noise and increases checkpoint storage sizes.
- **How**: It uses LangGraph's `RemoveMessage` to delete all intermediate executing messages that occur between the latest user prompt and the final reply. The clean history is instead preserved in the `rendered_turns` list.

---

## 3. Durable Customer Memory and Profile

Durable memories track long-term contact profiles and behavioral preference data. This data persists across different threads and channels (web and WhatsApp).

### Data Modeling and Schema
Durable data is split into two models:
1. **Customer Profile (`CustomerProfile` in [customer_profile.py](../app/models/customer_profile.py))**:
   - Stores contact details.
   - Fields: `user_identity`, `name`, `phone`, `addresses` (JSONB list of label/value entries), and `last_order` (JSONB details).
2. **Customer Memory (`CustomerMemory` in [customer_memory.py](../app/models/customer_memory.py))**:
   - Stores behavioural preferences.
   - Fields: `user_identity` and `memory` (JSONB of structured preferences).

### Read Cache Pattern
- PostgreSQL is the system of record.
- Redis acts as a fast cache using the prefix `customer_profile:<identity>` or `customer_memory:<identity>` with a **1-hour TTL** (3600 seconds).
- The repositories ([CustomerProfileRepository](../app/repositories/customer_profile_repository.py) and [CustomerMemoryRepository](../app/repositories/customer_memory_repository.py)) enforce a read-through pattern:
  - Check Redis. If found, deserialize and return.
  - If not found in Redis, read from Postgres, serialize, set in Redis with TTL, and return.
  - Any writes (upserts) update Postgres first, and then overwrite/set the Redis cache.

---

## 4. LLM Memory Extractor and Lifecycle

The long-term profile and memory are updated automatically by the LLM in the background.

```
Conversation Turn
  -> Planner Node evaluates user message
  -> If lasting preferences or profile details are present:
       AgentState.requires_memory_update = True
  -> Turn finishes and generates reply
  -> respond() schedules _run_write_memory_background
  -> Background task triggers write_memory node:
       Utility model extracts structured data -> Upserts to Postgres & Redis
```

### 1. Analysis and Flagging (During the Turn)
In the `plan` node ([graph.py](../app/orchestrator/graph.py)), the planner uses the utility model to analyze the user's current message and set:
- `requires_memory_update = True`
This flag is set **only** if the customer explicitly states a lasting preference, shares lasting details about contacts (e.g. partner's favorite items), or provides new profile contact details.

### 2. Background Extraction Task (After the Turn)
To keep latency low for the customer, long-term memory writes do not block the chat reply.
- When the orchestrator finishes compiling the response in `respond()`, it checks if `requires_memory_update` is true, or if checkout/tracking events occurred.
- If true, it schedules the background task `_run_write_memory_background` which calls `write_memory` ([memory.py](../app/orchestrator/nodes/memory.py#L129)).

### 3. Extraction Prompt and Pydantic Mapping
Inside `write_memory`:
- The service retrieves the latest message exchanges (up to a window of 3).
- It calls a lightweight utility model with structured output constraint mapped to the `CombinedExtraction` schema ([memory.py](../app/schemas/memory.py#L11)).
- The model runs against `COMBINED_MEMORY_EXTRACT_PROMPT` ([prompts.py](../app/orchestrator/prompts.py#L365)):
  - **Profile Details**: Real name, phone, and addresses belonging to the *buyer*. Gift recipient details are skipped to prevent profile pollution.
  - **Behavioral Preferences**: Gender, favorite product categories, recipient facts, standing delivery notes, and preferred languages (e.g. `si`, `en`, `singlish`).

### 4. Postgres and Cache Synchronization
- **Contact Profile Update**: `CustomerProfileRepository.upsert_missing(identity, profile_data)` fills in null fields. It will not overwrite existing values to ensure user edits remain intact. It also performs similarity matching on addresses to update existing ones if they are similar rather than creating duplicates.
- **Behavioral Memory Update**: `CustomerMemoryRepository.upsert(identity, memory_dict)` updates the preferences.
- **Last Order Details**: Checkout actions automatically invoke `CustomerProfileRepository.save_last_order` to write the latest checkout items into the profile so customers can easily trigger repeat orders.

---

## 5. Ephemeral Redis Caches and State Keys

Redis is used for temporary states, caching, and infrastructure needs. All keys are prefix-namespaced.

### Per-Session Carts (`cart:<cart_key>`)
- **Key Format**: `cart:<principal_kind>:<principal_id>:<conversation_uuid>`
- **TTL**:
  - Users: **7 days** (604,800 seconds).
  - Guests: **1 day** (86,400 seconds).
- **Behavior**: Stores the list of items in the checkout cart as a JSON list. Operations are synchronized per key using a lock dictionary (`_locks`) in [CartRepository](../app/repositories/cart_repository.py) to prevent concurrent modification issues.

### Guest Records (`guest:<guest_id>`)
- **Key Format**: `guest:<guest_id>`
- **TTL**: Set dynamically during creation (defined by HTTP session rules).
- **Behavior**: Stores guest session parameters (e.g., credentials, session state) to authorize anonymous sessions before authentication occurs.

### WhatsApp Message Deduplication (`dedup:<message_id>`)
- **Key Format**: `dedup:<wamid>`
- **TTL**: **24 hours** (86,400 seconds).
- **Behavior**: Used in the NATS consumer ([consumer.py](../app/messaging/consumer.py)) to guarantee idempotency. Before processing a WhatsApp message, the handler sets this key. If the key already exists (e.g. during message retries or consumer restarts), the message is skipped.

### MCP Tool Cache (`mcp_cache:<tool_name>:<args_hash>`)
- **Key Format**: `mcp_cache:<tool_name>:<md5_hash_of_args>`
- **TTL**: Dynamic (configured for read-only lookups).
- **Behavior**: Caches read-only Kakille MCP tool results (e.g., product details, search parameters). If Redis is unreachable, the system falls back to direct MCP server calls to ensure the agent remains available.

### Rate Limiting (`limiter:<endpoint>:<ip_or_user>`)
- **Behavior**: Tracks requests in sliding windows to prevent abuse.
