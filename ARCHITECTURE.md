# 🏗️ DynAmi Robot - Architectures Essentielles

---

## 1. 🌐 Architecture Serveur

### Vue d'ensemble du système

```mermaid
graph TB
    subgraph "🌐 DynAmi Server (Node.js)"
        HTTP[🌍 Express Server<br/>Port 3000]

        subgraph "📦 Core Services"
            SEC[🛡️ SecurityService<br/>ML + Rule-based]
            MEM[💾 MemoryService<br/>JSON + ChromaDB]
            VIS[👁️ VisionService<br/>OpenCV + YOLOv4]
            LLM[🤖 LLMService<br/>Hugging Face API]
        end
    end

    subgraph "📱 Client Layer"
        APP[📱 React Native App]
    end

    subgraph "🔧 Hardware Layer"
        RPI[🍓 Raspberry Pi<br/>Python Scripts]
        STM[⚡ STM32<br/>C Firmware]
    end

    APP -->|HTTP/WebSocket| HTTP
    HTTP --> SEC
    HTTP --> MEM
    HTTP --> VIS
    HTTP --> LLM
    HTTP -->|UART/Serial| RPI
    RPI -->|I2C/SPI| STM
```

---

## 2. 🔍 Architecture RAG

### Pipeline de traitement d'une requête

```mermaid
flowchart LR
    INPUT[📝 User Query<br/>"Hello, how are you?"]

    subgraph "🔍 Retrieval Phase"
        EMBED[🧠 Text Embedding<br/>Vector Conversion]
        SEARCH[🔍 Semantic Search<br/>ChromaDB Query]
        RESULTS[📊 Top 3 Results<br/>Relevant Conversations]
    end

    subgraph "📋 Context Assembly"
        CONTEXT[📝 Context Building]
        PREFS[⚙️ User Preferences]
        VISION[👁️ Vision Context]
        EMOTION[😊 Emotion Analysis]
    end

    subgraph "🤖 Generation Phase"
        PROMPT[📄 Enhanced Prompt<br/>System + Context + Query]
        LLM[🤖 LLM Call<br/>Hugging Face API]
        RESPONSE[✅ Generated Response]
    end

    subgraph "💾 Storage Phase"
        STORE_JSON[📄 JSON Storage<br/>conversations.json]
        STORE_VECTOR[🔍 Vector Storage<br/>ChromaDB]
        UPDATE[🔄 Update Embeddings]
    end

    INPUT --> EMBED
    EMBED --> SEARCH
    SEARCH --> RESULTS

    RESULTS --> CONTEXT
    PREFS --> CONTEXT
    VISION --> CONTEXT
    EMOTION --> CONTEXT

    CONTEXT --> PROMPT
    PROMPT --> LLM
    LLM --> RESPONSE

    RESPONSE --> STORE_JSON
    RESPONSE --> STORE_VECTOR
    STORE_VECTOR --> UPDATE
```

### Système de stockage dual

```mermaid
graph TB
    subgraph "💾 Dual Storage System"
        subgraph "📄 JSON Storage"
            JSON[(conversations.json)]
            IMMEDIATE[⚡ Immediate Save]
            BACKUP[🔄 Backup & History]
        end

        subgraph "🔍 Vector Database"
            CHROMA[(ChromaDB)]
            SEMANTIC[🧠 Semantic Search]
            SIMILARITY[📊 Similarity Matching]
        end
    end

    CONV[💬 New Conversation] --> IMMEDIATE
    IMMEDIATE --> JSON
    IMMEDIATE --> SEMANTIC
    SEMANTIC --> CHROMA

    JSON -.->|Sync| CHROMA
    CHROMA -.->|Search| SIMILARITY
```
