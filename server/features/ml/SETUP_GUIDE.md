# MWANGA Stack Setup Guide

**Status:** Database ✅ | External Services ⏳ | Integration ⏳ | Testing ⏳

This guide walks through setting up the complete MWANGA Stack infrastructure for local development and production deployment.

## Prerequisites

- Node.js 18+ and pnpm
- Python 3.10+ (for spaCy, scikit-learn, NetworkX)
- PostgreSQL database (already configured)
- 8GB+ RAM (for running Ollama locally)
- 10GB+ disk space (for models)

## Phase 1: Database Setup ✅ COMPLETE

The database migration has been successfully completed with 13 tables.

```bash
# Already completed - for reference only
npm run db:migrate
```

**Status:** ✅ 13/13 tables created, 38 indexes, 8 foreign keys validated

## Phase 2: External Services Installation

### 2.1 Install Ollama (Local LLM)

Ollama provides local LLM inference for Tier 3 analysis.

**Windows:**
```powershell
# Download from https://ollama.ai/download
# Or use winget
winget install Ollama.Ollama
```

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Verify Installation:**
```bash
ollama --version
```

**Pull Llama 3.2 Model:**
```bash
# Pull the 3B parameter model (recommended for development)
ollama pull llama3.2

# Or pull the 1B parameter model (faster, less accurate)
ollama pull llama3.2:1b

# Verify model is available
ollama list
```

**Start Ollama Server:**
```bash
# Ollama runs as a service on Windows/macOS
# On Linux, start manually:
ollama serve
```

**Test Ollama:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What is the capital of Kenya?",
  "stream": false
}'
```

### 2.2 Install ChromaDB (Vector Database)

ChromaDB provides vector storage for constitutional RAG.

**Install via pip:**
```bash
pip install chromadb
```

**Or via conda:**
```bash
conda install -c conda-forge chromadb
```

**Verify Installation:**
```bash
python -c "import chromadb; print(chromadb.__version__)"
```

**Start ChromaDB Server:**
```bash
# Option 1: Run as Python module
python -m chromadb.cli run --host localhost --port 8000

# Option 2: Use Docker
docker run -p 8000:8000 chromadb/chroma
```

**Test ChromaDB:**
```bash
curl http://localhost:8000/api/v1/heartbeat
```

### 2.3 Install HuggingFace Transformers

HuggingFace provides pre-trained models for Tier 2 analysis.

**Install via pip:**
```bash
pip install transformers torch sentence-transformers
```

**Download Models:**
```python
# Run this Python script to download models
from transformers import pipeline
from sentence_transformers import SentenceTransformer

# Sentiment analysis model (RoBERTa)
sentiment = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")

# Sentence embeddings model (for ChromaDB)
embedder = SentenceTransformer('all-MiniLM-L6-v2')

print("✅ Models downloaded successfully")
```

**Test HuggingFace:**
```python
from transformers import pipeline

sentiment = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")
result = sentiment("This bill is excellent for Kenya!")
print(result)
```

### 2.4 Install spaCy (NLP)

spaCy provides NLP capabilities for Tier 2 analysis.

**Install via pip:**
```bash
pip install spacy
```

**Download English Model:**
```bash
python -m spacy download en_core_web_sm
```

**Test spaCy:**
```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The Finance Bill 2024 proposes new taxes.")
print([(token.text, token.pos_) for token in doc])
```

### 2.5 Install NetworkX (Graph Analysis)

NetworkX provides graph analysis for conflict detection.

**Install via pip:**
```bash
pip install networkx matplotlib
```

**Test NetworkX:**
```python
import networkx as nx

G = nx.Graph()
G.add_edge("MP A", "Company B")
G.add_edge("Company B", "Industry C")
print(f"Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
```

### 2.6 Install scikit-learn (Machine Learning)

scikit-learn provides ML models for engagement prediction.

**Install via pip:**
```bash
pip install scikit-learn pandas numpy
```

**Test scikit-learn:**
```python
from sklearn.ensemble import GradientBoostingClassifier
import numpy as np

X = np.random.rand(100, 7)
y = np.random.randint(0, 2, 100)
model = GradientBoostingClassifier()
model.fit(X, y)
print(f"✅ Model trained with accuracy: {model.score(X, y):.2f}")
```

## Phase 3: Python Service Setup

Create a Python microservice to serve ML models.

### 3.1 Create Python Service

**Directory Structure:**
```
server/features/ml/python-service/
├── app.py                 # FastAPI application
├── requirements.txt       # Python dependencies
├── models/
│   ├── sentiment.py      # Sentiment analysis
│   ├── constitutional.py # Constitutional RAG
│   ├── spacy_analyzer.py # spaCy NLP
│   └── graph_analyzer.py # NetworkX graph
└── config.py             # Configuration
```

**Create requirements.txt:**
```txt
fastapi==0.104.1
uvicorn==0.24.0
chromadb==0.4.18
transformers==4.35.2
torch==2.1.1
sentence-transformers==2.2.2
spacy==3.7.2
networkx==3.2.1
scikit-learn==1.3.2
pandas==2.1.3
numpy==1.26.2
pydantic==2.5.0
python-dotenv==1.0.0
```

**Create app.py:**
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="MWANGA Stack ML Service")

class SentimentRequest(BaseModel):
    text: str
    language: str = "en"

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    scores: dict

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mwanga-ml"}

@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    # TODO: Implement sentiment analysis
    return {
        "sentiment": "neutral",
        "confidence": 0.8,
        "scores": {"positive": 0.3, "neutral": 0.5, "negative": 0.2}
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Install and Run:**
```bash
cd server/features/ml/python-service
pip install -r requirements.txt
python app.py
```

**Test Python Service:**
```bash
curl http://localhost:8001/health
```

## Phase 4: Node.js Integration

### 4.1 Update MWANGA Config

Update `server/features/ml/config/mwanga-config.ts` with service URLs:

```typescript
export const MWANGA_CONFIG = {
  services: {
    ollama: {
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: 'llama3.2',
      timeout: 30000,
    },
    chromadb: {
      baseUrl: process.env.CHROMADB_URL || 'http://localhost:8000',
      collection: 'kenyan_constitution',
    },
    pythonService: {
      baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8001',
      timeout: 10000,
    },
  },
  // ... rest of config
};
```

### 4.2 Create Service Clients

Create TypeScript clients for external services:

```typescript
// server/features/ml/services/ollama-client.ts
export class OllamaClient {
  async generate(prompt: string): Promise<string> {
    // TODO: Implement Ollama API call
  }
}

// server/features/ml/services/chromadb-client.ts
export class ChromaDBClient {
  async query(text: string, n: number = 5): Promise<any[]> {
    // TODO: Implement ChromaDB query
  }
}

// server/features/ml/services/python-client.ts
export class PythonServiceClient {
  async analyzeSentiment(text: string): Promise<any> {
    // TODO: Implement Python service call
  }
}
```

## Phase 5: Initialize ChromaDB with Constitution

### 5.1 Prepare Constitution Data

Download and prepare the Kenyan Constitution:

```bash
# Create data directory
mkdir -p server/features/ml/data

# Download Constitution (example - replace with actual source)
curl -o server/features/ml/data/constitution.txt \
  https://www.constituteproject.org/constitution/Kenya_2010.txt
```

### 5.2 Create Initialization Script

```python
# server/features/ml/scripts/init_chromadb.py
import chromadb
from sentence_transformers import SentenceTransformer

# Initialize ChromaDB client
client = chromadb.HttpClient(host="localhost", port=8000)

# Create collection
collection = client.create_collection(
    name="kenyan_constitution",
    metadata={"description": "Constitution of Kenya 2010"}
)

# Load embedder
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# Load constitution text
with open('../data/constitution.txt', 'r') as f:
    text = f.read()

# Split into chunks (by article)
chunks = split_by_article(text)

# Generate embeddings and add to ChromaDB
for i, chunk in enumerate(chunks):
    embedding = embedder.encode(chunk['text'])
    collection.add(
        ids=[f"article_{i}"],
        embeddings=[embedding.tolist()],
        documents=[chunk['text']],
        metadatas=[{
            "article": chunk['article'],
            "title": chunk['title']
        }]
    )

print(f"✅ Initialized ChromaDB with {len(chunks)} articles")
```

## Phase 6: Testing

### 6.1 Test Individual Analyzers

```bash
# Create test script
npm run test:ml:sentiment
npm run test:ml:constitutional
npm run test:ml:trojan
npm run test:ml:conflict
npm run test:ml:engagement
```

### 6.2 Integration Tests

```bash
# Test full pipeline
npm run test:ml:integration
```

## Phase 7: Deployment

### 7.1 Environment Variables

Add to `.env`:

```env
# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ChromaDB
CHROMADB_URL=http://localhost:8000
CHROMADB_COLLECTION=kenyan_constitution

# Python Service
PYTHON_SERVICE_URL=http://localhost:8001

# ML Configuration
ML_ENABLE_CACHING=true
ML_CACHE_TTL=3600
ML_ENABLE_FALLBACK=true
```

### 7.2 Docker Compose (Optional)

```yaml
# docker-compose.ml.yml
version: '3.8'

services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma

  python-service:
    build: ./server/features/ml/python-service
    ports:
      - "8001:8001"
    environment:
      - OLLAMA_URL=http://ollama:11434
      - CHROMADB_URL=http://chromadb:8000

volumes:
  ollama_data:
  chromadb_data:
```

## Troubleshooting

### Ollama Issues

**Problem:** Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
# Windows: Restart from Services
# macOS: brew services restart ollama
# Linux: systemctl restart ollama
```

### ChromaDB Issues

**Problem:** ChromaDB connection refused
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
python -m chromadb.cli run --host localhost --port 8000
```

### Python Service Issues

**Problem:** Import errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version  # Should be 3.10+
```

## Next Steps

1. ✅ Database migration complete
2. ⏳ Install external services (this guide)
3. ⏳ Implement service integrations
4. ⏳ Test all analyzers
5. ⏳ Deploy to staging

## Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- [spaCy Documentation](https://spacy.io/usage)
- [NetworkX Documentation](https://networkx.org/documentation/stable/)
- [scikit-learn Documentation](https://scikit-learn.org/stable/)

---

*Last Updated: March 6, 2026*  
*Status: Phase 1 Complete, Phase 2 In Progress*
