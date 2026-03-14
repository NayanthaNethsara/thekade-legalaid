# Technical Proposal & System Architecture: theKade-LegalAid

## 1. Executive Summary
theKade-LegalAid is a cutting-edge, AI-powered legal assistance platform designed to democratize access to legal knowledge. By combining the accessibility of WhatsApp with the power of Large Language Models (LLMs) and a robust event-driven microservices architecture, the platform provides real-time, context-aware legal guidance, automated scheduling, and document management. This proposal outlines the technical foundation and the strategic roadmap for the platform.

---

## 2. Strategic System Architecture

The platform is built on an **Event-Driven Microservices Architecture**, ensuring high availability, fault tolerance, and the ability to process complex, multi-modal legal queries asynchronously.

### 2.1 High-Level Architecture Diagram
```mermaid
graph TD
    %% Users and Interfaces
    User([User / Legal Professional]) <--> WhatsApp([WhatsApp Cloud API])
    WebClient([Web Management Interface]) <--> KakilleService[[Kakille Service Backend]]
    
    %% Communication Layer
    subgraph "Intelligent Gateway Layer"
        Gateway[[WhatsApp Gateway - NestJS]]
        BlobStorage[(Azure Blob Storage)]
        Gateway --- BlobStorage
    end

    %% Message Broker
    subgraph "High-Performance Event Bus (NATS JetStream)"
        VoiceQueue{{voice_queue}}
        TextQueue{{text_queue}}
        NotifyQueue{{notification_queue}}
    end

    %% Logic & Processing Layer
    subgraph "LangGraph Agentic Engine"
        Whisper[[Whisper Service - ASR]]
        ConvService[[Conversation Service - Python]]
        Gemini([Google Gemini 2.5 Flash])
        ConvService --- Gemini
    end

    %% Database & Tools
    subgraph "Knowledge & Persistence Layer"
        VectorDB[(PostgreSQL + pgvector)]
        Redis[(Redis State Cache)]
        MCPServer[[Modular Task MCP Server]]
    end

    %% Connections
    WhatsApp <--> Gateway
    Gateway --> VoiceQueue
    Gateway --> TextQueue
    
    KakilleService --> NotifyQueue
    
    VoiceQueue --> Whisper
    Whisper --> TextQueue
    
    TextQueue --> ConvService
    ConvService --> NotifyQueue
    NotifyQueue --> Gateway
    
    ConvService --> MCPServer
    ConvService --> VectorDB
    ConvService --> Redis
```

---

## 3. LangGraph Node Architecture

The **Conversation Service** utilizes a sophisticated LangGraph pipeline to handle complex multi-turn reasoning and tool orchestration.

### 3.1 Internal Node Flow & MCP Integration
```mermaid
graph LR
    Start((START)) --> LoadMemory[load_memory]
    LoadMemory --> Onboarding{onboarding}
    
    Onboarding -- "New/Guest" --> RespGen[response_generator]
    Onboarding -- "Authorized" --> Guardrail{guardrail}
    
    Guardrail -- "Unsafe" --> RespGen
    Guardrail -- "Safe" --> Refiner[prompt_refiner]
    
    Refiner --> QueryGen[query_generator]
    QueryGen --> ToolDecider{tool_decider}
    
    ToolDecider -- "Needs Tools" --> ToolExec[tool_executor]
    ToolDecider -- "Direct Chat" --> RespGen
    
    subgraph "Modular MCP Tools"
        ToolExec -- "JSON-RPC" --> RAGAction[RAG Search]
        ToolExec -- "JSON-RPC" --> CalendarAction[Schedule Meeting]
        ToolExec -- "JSON-RPC" --> NoteAction[Keep Note]
    end
    
    RAGAction --> RespGen
    CalendarAction --> RespGen
    NoteAction --> RespGen
    
    RespGen --> SaveMemory[save_memory]
    SaveMemory --> End((END))

    %% Styles
    style LoadMemory fill:#f9f,stroke:#333,stroke-width:2px
    style ToolExec fill:#bbf,stroke:#333,stroke-width:2px
    style RespGen fill:#bfb,stroke:#333,stroke-width:2px
```

---

## 4. Technology Stack Deep Dive

### 4.1 Core Technologies
- **NestJS (Node.js)**: Powers the WhatsApp Gateway and the upcoming **Kakille Service**.
- **Python & LangGraph**: The core AI logic. LangGraph enables stateful, multi-turn agentic conversations via dedicated nodes.
- **Whisper ASR**: OpenAI's state-of-the-art speech recognition model.
- **Modular MCP**: Standalone tool server providing Meeting, Note-taking, and Knowledge Base search.

### 4.2 Data & Storage
- **PostgreSQL + pgvector**: Unified relational and vector database for RAG.
- **Redis**: High-speed checkpointing and **Conversation Memory** persistence (Messages + Follow-up context).

---

## 5. Industrial-Grade Event Flow

### 5.1 Voice Processing Sequence
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant G as Gateway
    participant VQ as Voice Queue
    participant W as Whisper (ASR)
    participant TQ as Text Queue
    participant A as AI Agent (LangGraph Nodes)
    participant M as MCP Server (Tools)
    participant NQ as Notification Queue

    U->>G: User sends Voice Note
    G->>VQ: Publish 'voice_received'
    VQ->>W: Process Audio
    W->>TQ: Publish 'text_ready'
    TQ->>A: Trigger pipeline (load_memory -> query_gen)
    A->>M: tool_executor: CALL rag_search()
    M-->>A: Return text snippets
    A->>A: response_generator: Synthesize reply
    A->>NQ: Publish 'reply_ready'
    NQ->>G: Deliver to WhatsApp
    G->>U: Finished Response
```

---

## 6. Security, Compliance & Scalability
- **End-to-End Encryption**: WhatsApp's secure channel.
- **Node-Level Isolation**: LangGraph nodes are stateless and fetch context from Redis, allowing for horizontal scaling of the reasoning engine.
- **Service Isolation**: Each queue consumer (Whisper, Agent, Gateway) scales independently.
