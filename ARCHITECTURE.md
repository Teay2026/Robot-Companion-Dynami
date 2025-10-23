# 🏗️ DynAmi Robot - Architecture Documentation

Ce document présente les architectures techniques essentielles du projet DynAmi, un robot compagnon intelligent avec capacités d'IA conversationnelle et de sécurité avancée.

---

## 1. 🌐 Architecture Serveur

### Vue d'ensemble du système
Le serveur DynAmi utilise une architecture modulaire avec des services spécialisés pour chaque fonctionnalité.

```mermaid
graph TB
    subgraph "🌐 DynAmi Server (Node.js)"
        HTTP[🌍 Express Server<br/>Port 3000]
        WS[🔌 Socket.io Server<br/>/cam namespace]
        LT[🌍 LocalTunnel<br/>Public Exposure]

        subgraph "📦 Core Services"
            SEC[🛡️ SecurityService<br/>ML + Rule-based]
            MEM[💾 MemoryService<br/>JSON + ChromaDB]
            VIS[👁️ VisionService<br/>OpenCV + YOLOv4]
            LLM[🤖 LLMService<br/>Hugging Face API]
            PREF[⚙️ PreferencesService<br/>User Settings]
        end
    end

    subgraph "📱 Client Layer"
        APP[📱 React Native App]
        WEB[🌐 Web Interface]
    end

    subgraph "🔧 Hardware Layer"
        RPI[🍓 Raspberry Pi<br/>Python Scripts]
        STM[⚡ STM32<br/>C Firmware]
        SENSORS[📡 Sensors & Actuators]
    end

    APP -->|HTTP/WebSocket| HTTP
    WEB -->|HTTP| HTTP
    HTTP --> SEC
    HTTP --> MEM
    HTTP --> VIS
    HTTP --> LLM
    HTTP --> PREF
    WS -->|Camera Stream| VIS
    HTTP -->|UART/Serial| RPI
    RPI -->|I2C/SPI| STM
    STM --> SENSORS

    LT -->|Tunnel| HTTP
```

### Pipeline de traitement des messages

```mermaid
flowchart TD
    INPUT[📝 User Message Input]

    subgraph "🛡️ Security Layer"
        SEC1[🤖 ML Intent Classification<br/>DistilBERT Analysis]
        SEC2[🧠 Behavioral Detection<br/>Zero-shot Classification]
        SEC3[📋 Rule-based Fallback<br/>Pattern Matching]
        BLOCK{❌ Block Message?}
    end

    subgraph "🔍 RAG Context Layer"
        SEARCH[🔍 Semantic Search<br/>ChromaDB Vectors]
        PREF_GET[⚙️ User Preferences<br/>Personal Settings]
        VISION[👁️ Vision Context<br/>Current Scene Analysis]
        EMOTION[😊 Emotion Detection<br/>Facial Analysis]
    end

    subgraph "🤖 Generation Layer"
        PROMPT[📝 Enhanced Prompt<br/>Context Assembly]
        LLM_CALL[🤖 LLM Generation<br/>Hugging Face API]
        FALLBACK[🔄 Fallback Response<br/>Safe Defaults]
    end

    subgraph "🔒 Validation Layer"
        PERSONA[🎭 Persona Enforcement<br/>Character Consistency]
        SAFE[🛡️ Safety Validation<br/>Content Filtering]
        MEMORY_CHECK{💾 Store in Memory?}
    end

    OUTPUT[✅ Final Response]
    STORAGE[(💾 Memory Storage<br/>JSON + ChromaDB)]

    INPUT --> SEC1
    SEC1 --> SEC2
    SEC2 --> SEC3
    SEC3 --> BLOCK

    BLOCK -->|Yes| OUTPUT
    BLOCK -->|No| SEARCH

    SEARCH --> PREF_GET
    PREF_GET --> VISION
    VISION --> EMOTION
    EMOTION --> PROMPT

    PROMPT --> LLM_CALL
    LLM_CALL -->|Success| PERSONA
    LLM_CALL -->|Error| FALLBACK
    FALLBACK --> PERSONA

    PERSONA --> SAFE
    SAFE --> MEMORY_CHECK
    MEMORY_CHECK -->|Yes| STORAGE
    MEMORY_CHECK -->|No| OUTPUT
    STORAGE --> OUTPUT
```

---

## 2. 🔍 Architecture RAG (Retrieval-Augmented Generation)

### Système de stockage dual
Le système RAG utilise un stockage hybride pour optimiser les performances et la recherche sémantique.

```mermaid
graph TB
    subgraph "🔍 RAG Memory System"
        subgraph "📄 JSON Storage"
            JSON[(conversations.json)]
            HIST[📚 Conversation History]
            META[🏷️ User Metadata]
            KEYWORDS[🔑 Simple Keywords]

            JSON --> HIST
            JSON --> META
            JSON --> KEYWORDS
        end

        subgraph "🔍 Vector Database"
            CHROMA[(ChromaDB)]
            EMBED[🧠 Semantic Embeddings]
            SEARCH[🔍 Similarity Search]
            CONTEXT[📋 Context Retrieval]

            CHROMA --> EMBED
            CHROMA --> SEARCH
            CHROMA --> CONTEXT
        end
    end

    subgraph "🔄 Migration Process"
        MIGRATE[⚡ Auto-Migration<br/>JSON → ChromaDB]
        SYNC[🔄 Real-time Sync<br/>Dual Storage]
    end

    JSON -.->|Migration| MIGRATE
    MIGRATE --> CHROMA
    HIST -.->|Sync| SYNC
    SYNC --> EMBED
```

### Pipeline RAG détaillé

```mermaid
flowchart TD
    QUERY[📝 User Query]

    subgraph "🔍 Search Process"
        CLEAN[🧹 Text Preprocessing<br/>Cleaning & Normalization]
        EMBED_GEN[🧠 Embedding Generation<br/>Vector Conversion]
        SIMILARITY[📊 Similarity Search<br/>ChromaDB Query]
        RANK[📈 Result Ranking<br/>Relevance Scoring]
    end

    subgraph "📋 Context Assembly"
        CONV[💬 Top Conversations<br/>Most Relevant (3)]
        USER_PREF[👤 User Preferences<br/>Personal Settings]
        VIS_CTX[👁️ Vision Context<br/>Current Scene]
        EMO_CTX[😊 Emotion Context<br/>Facial Analysis]
        BASELINE[🎭 Persona Baseline<br/>Robot Character]
    end

    subgraph "🤖 Prompt Construction"
        SYS_PROMPT[🎭 System Prompt<br/>Robot Personality]
        CTX_INJECT[📝 Context Injection<br/>Retrieved Information]
        USER_MSG[💬 User Message<br/>Current Query]
        GUIDELINES[📋 Response Guidelines<br/>Behavior Rules]
        FINAL_PROMPT[📄 Enhanced Prompt<br/>Complete Context]
    end

    subgraph "💾 Memory Update"
        STORE_JSON[📄 JSON Storage<br/>Immediate Save]
        STORE_VECTOR[🔍 Vector Storage<br/>ChromaDB Add]
        UPDATE_PREF[⚙️ Update Preferences<br/>Learning Loop]
    end

    RESPONSE[✅ LLM Response]

    QUERY --> CLEAN
    CLEAN --> EMBED_GEN
    EMBED_GEN --> SIMILARITY
    SIMILARITY --> RANK

    RANK --> CONV
    RANK --> USER_PREF
    RANK --> VIS_CTX
    RANK --> EMO_CTX
    RANK --> BASELINE

    CONV --> SYS_PROMPT
    USER_PREF --> CTX_INJECT
    VIS_CTX --> CTX_INJECT
    EMO_CTX --> CTX_INJECT
    BASELINE --> SYS_PROMPT

    SYS_PROMPT --> USER_MSG
    CTX_INJECT --> USER_MSG
    USER_MSG --> GUIDELINES
    GUIDELINES --> FINAL_PROMPT

    FINAL_PROMPT --> RESPONSE

    RESPONSE --> STORE_JSON
    RESPONSE --> STORE_VECTOR
    RESPONSE --> UPDATE_PREF
```

### Isolation utilisateur et sécurité

```mermaid
graph TB
    subgraph "👥 Multi-User RAG System"
        subgraph "🏷️ User Isolation"
            USER_A[👤 User A<br/>userId: user_a]
            USER_B[👤 User B<br/>userId: user_b]
            USER_C[👤 User C<br/>userId: user_c]
        end

        subgraph "🔒 Security Layer"
            FILTER[🛡️ Context Filtering<br/>User-specific Data]
            PRIVACY[🔐 Privacy Protection<br/>Cross-user Isolation]
            CONTAMINATION[🧼 Memory Protection<br/>Contamination Prevention]
        end

        subgraph "💾 Isolated Storage"
            CONV_A[(📚 Conversations A)]
            CONV_B[(📚 Conversations B)]
            CONV_C[(📚 Conversations C)]

            PREF_A[(⚙️ Preferences A)]
            PREF_B[(⚙️ Preferences B)]
            PREF_C[(⚙️ Preferences C)]
        end

        subgraph "🔍 Smart Retrieval"
            SEMANTIC[🧠 Semantic Search<br/>User-scoped Vectors]
            WEIGHTED[⚖️ Weighted Scoring<br/>Relevance + Recency]
            CONTEXT_BUILD[📋 Context Building<br/>Personalized Assembly]
        end
    end

    USER_A --> FILTER
    USER_B --> FILTER
    USER_C --> FILTER

    FILTER --> PRIVACY
    PRIVACY --> CONTAMINATION

    CONTAMINATION --> CONV_A
    CONTAMINATION --> CONV_B
    CONTAMINATION --> CONV_C

    CONV_A --> PREF_A
    CONV_B --> PREF_B
    CONV_C --> PREF_C

    CONV_A --> SEMANTIC
    CONV_B --> SEMANTIC
    CONV_C --> SEMANTIC

    SEMANTIC --> WEIGHTED
    WEIGHTED --> CONTEXT_BUILD
```

---

## 🛡️ Sécurité ML Intégrée

### Architecture de sécurité hybride

```mermaid
graph TB
    subgraph "🛡️ ML Security Architecture"
        subgraph "🤖 ML Classification"
            DISTILBERT[🧠 DistilBERT<br/>Sentiment Analysis]
            ZERO_SHOT[🎯 Zero-shot BART<br/>Behavioral Classification]
            COMMAND_DETECT[⚡ Command Structure<br/>Pattern Detection]
        end

        subgraph "📋 Rule-based Fallback"
            KEYWORDS[🔑 Keyword Matching<br/>Injection Patterns]
            PHRASES[📝 Phrase Detection<br/>Dangerous Commands]
            HEURISTICS[🔍 Heuristic Analysis<br/>Structure Patterns]
        end

        subgraph "🔄 Hybrid Decision"
            ML_SCORE[📊 ML Confidence Score]
            RULE_SCORE[📈 Rule-based Score]
            COMBINED[⚖️ Combined Assessment]
            DECISION{🚦 Security Decision}
        end

        subgraph "🎯 Response Actions"
            BLOCK[❌ Block & Log]
            SAFE_RESPONSE[🛡️ Safe Response]
            ALLOW[✅ Allow Processing]
            MEMORY_FILTER[🧹 Memory Filtering]
        end
    end

    INPUT[📝 User Input]

    INPUT --> DISTILBERT
    INPUT --> ZERO_SHOT
    INPUT --> COMMAND_DETECT
    INPUT --> KEYWORDS
    INPUT --> PHRASES
    INPUT --> HEURISTICS

    DISTILBERT --> ML_SCORE
    ZERO_SHOT --> ML_SCORE
    COMMAND_DETECT --> ML_SCORE

    KEYWORDS --> RULE_SCORE
    PHRASES --> RULE_SCORE
    HEURISTICS --> RULE_SCORE

    ML_SCORE --> COMBINED
    RULE_SCORE --> COMBINED

    COMBINED --> DECISION

    DECISION -->|High Risk| BLOCK
    DECISION -->|Medium Risk| SAFE_RESPONSE
    DECISION -->|Low Risk| ALLOW
    DECISION -->|Memory Risk| MEMORY_FILTER
```

---

## 📈 Métriques et Monitoring

### Système de monitoring intégré

```mermaid
graph LR
    subgraph "📊 System Metrics"
        RAG_STATS[🔍 RAG Performance<br/>Search Speed & Accuracy]
        SEC_STATS[🛡️ Security Events<br/>Threats Blocked]
        MEM_STATS[💾 Memory Usage<br/>Storage & Retrieval]
        API_STATS[🌐 API Performance<br/>Response Times]
    end

    subgraph "📈 Analytics Dashboard"
        CONVERSATIONS[💬 Conversation Analytics]
        USERS[👥 User Behavior]
        SECURITY[🚨 Security Incidents]
        PERFORMANCE[⚡ System Performance]
    end

    subgraph "🔔 Alerting"
        THREATS[🚨 Security Alerts]
        ERRORS[❌ Error Monitoring]
        PERFORMANCE_ALERT[📉 Performance Degradation]
    end

    RAG_STATS --> CONVERSATIONS
    SEC_STATS --> SECURITY
    MEM_STATS --> PERFORMANCE
    API_STATS --> PERFORMANCE

    SECURITY --> THREATS
    PERFORMANCE --> ERRORS
    PERFORMANCE --> PERFORMANCE_ALERT
```

Cette architecture modulaire permet à DynAmi de maintenir des conversations contextuelles et sécurisées tout en restant performant et extensible.