# MWANGA Stack ML Models

Zero-training-first ML/AI architecture for Chanuka Platform.

## Architecture Overview

The MWANGA Stack uses a three-tier progressive intelligence system:

```
Request → [Tier 1: Rules, <50ms, $0] → [Tier 2: Pre-trained Models, ~100ms, $0] → [Tier 3: Local LLM, ~800ms, $0]
```

## Models (10 Total)

### Core Analysis (6 Models)

1. **Sentiment Analyzer** (`sentiment-analyzer.ts`)
   - **Tier 1:** VADER + Kenyan political lexicon
   - **Tier 2:** HuggingFace `cardiffnlp/twitter-roberta-base-sentiment`
   - **Tier 3:** Ollama + Llama 3.2 (Swahili/Sheng edge cases)

2. **Constitutional Analyzer** (`constitutional-analyzer.ts`)
   - **Tier 1:** spaCy keyword matching (Bill of Rights terms)
   - **Tier 2:** ChromaDB + sentence-transformers RAG
   - **Tier 3:** Ollama + focused constitutional prompt

3. **Trojan Bill Detector** (`trojan-bill-detector.ts`)
   - **Tier 1:** Python scoring engine (heuristics)
   - **Tier 2:** spaCy structural analysis
   - **Tier 3:** Ollama chain-of-thought (high-risk bills only)

4. **Conflict Detector** (`conflict-detector.ts`)
   - **Tier 1:** Direct matching rules
   - **Tier 2:** NetworkX graph traversal
   - **Tier 3:** Ollama narration (pre-solved conflicts)

5. **Engagement Predictor** (`engagement-predictor.ts`)
   - **Tier 1:** Rule-based scoring (cold start)
   - **Tier 2:** scikit-learn GradientBoostingClassifier (after 1k interactions)
   - **Training:** Weekly retraining via MLflow

6. **Electoral Accountability Analyzer** (`electoral-accountability-analyzer.ts`) **NEW**
   - **Tier 1:** Rule-based gap calculation
   - **Tier 2:** Statistical analysis with trend detection
   - **Tier 3:** Ollama predictive analysis (electoral risk assessment)

### Strategic Analysis (3 Models)

7. **Influence Network Analyzer** (`influence-network-analyzer.ts`) **NEW**
   - **Tier 1:** Basic centrality measures
   - **Tier 2:** NetworkX full network analysis
   - **Tier 3:** Ollama narrative and strategic insights
   - **Purpose:** Map political influence networks, expose hidden power structures

8. **Content Classifier** (`content-classifier.ts`) **NEW**
   - **Tier 1:** Rule-based multi-task classification
   - **Tier 2:** HuggingFace multi-label classification
   - **Tier 3:** Ollama comprehensive analysis
   - **Purpose:** Real-time content routing and prioritization

9. **Transparency Analyzer** (`transparency-analyzer.ts`) **NEW**
   - **Tier 1:** Dimension scoring with rules
   - **Tier 2:** Statistical benchmarking
   - **Tier 3:** Ollama strategic recommendations
   - **Purpose:** Score transparency across 5 dimensions

### Accessibility (1 Model)

10. **Bill Summarizer** (`bill-summarizer.ts`) **NEW**
    - **Tier 1:** Extractive summarization with rules
    - **Tier 2:** spaCy + TextRank abstractive summarization
    - **Tier 3:** Ollama plain-language translation
    - **Purpose:** Make complex legislative text accessible to ordinary citizens
    - **Features:** Executive summaries, plain-language translation, Swahili support

## Infrastructure

- **Ollama:** Local LLM runtime (Llama 3.2, Mistral, Gemma)
- **ChromaDB:** Vector database for embeddings
- **sentence-transformers:** `all-MiniLM-L6-v2` for embeddings
- **HuggingFace:** Pre-trained models
- **spaCy:** NLP engine
- **LangChain:** RAG orchestration
- **MLflow:** Model tracking
- **NetworkX:** Graph analysis
- **scikit-learn:** ML training (engagement only)

## Cost

- Monthly operational cost: ~$20 (hosting only)
- API costs: $0
- Training infrastructure: $0

## Data Sovereignty

All data stays in Kenya. No external API calls. Full compliance with Kenya Data Protection Act.

## Getting Started

See individual model files for usage examples and API documentation.
