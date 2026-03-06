# MWANGA Stack Setup Guide

Complete setup instructions for the zero-training-first ML/AI architecture.

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+ (for ML services)
- 8-16GB RAM minimum
- 20GB disk space

## Installation Steps

### 1. Install Ollama (Local LLM Runtime)

**Linux/macOS:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download

**Pull Llama 3.2 model:**
```bash
ollama pull llama3.2
```

**Verify installation:**
```bash
ollama run llama3.2 "Hello, test message"
```

### 2. Install ChromaDB (Vector Database)

```bash
pip install chromadb
```

**Start ChromaDB server:**
```bash
chroma run --host localhost --port 8000
```

**Or use Docker:**
```bash
docker run -p 8000:8000 chromadb/chroma
```

### 3. Install Python Dependencies

```bash
pip install sentence-transformers spacy networkx scikit-learn mlflow
```

**Download spaCy English model:**
```bash
python -m spacy download en_core_web_sm
```

### 4. Install HuggingFace Transformers (Optional)

```bash
pip install transformers torch
```

### 5. Setup Database Schema

Run the migration:
```bash
# Using your existing migration system
npm run migrate:up
# Or manually:
psql -U your_user -d chanuka_db -f server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql
```

### 6. Configure Environment Variables

Add to `.env`:
```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ChromaDB Configuration
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# HuggingFace (optional - free tier works without key)
HUGGINGFACE_API_KEY=your_key_here

# MLflow
MLFLOW_TRACKING_URI=file:./mlruns

# Feature Flags
ML_SENTIMENT_ENABLED=true
ML_CONSTITUTIONAL_ENABLED=true
ML_TROJAN_BILL_ENABLED=true
ML_CONFLICT_ENABLED=true
ML_ENGAGEMENT_ENABLED=true
```

### 7. Initialize Constitutional Knowledge Base

Create a script to embed the Kenyan Constitution into ChromaDB:

```bash
# TODO: Create initialization script
npm run ml:init-constitution
```

This will:
1. Parse the Constitution of Kenya 2010
2. Chunk into sections
3. Generate embeddings using sentence-transformers
4. Store in ChromaDB

### 8. Build Conflict Graph

Initialize the conflict-of-interest graph:

```bash
# TODO: Create graph initialization script
npm run ml:init-conflict-graph
```

This will:
1. Import financial disclosure data
2. Build NetworkX graph
3. Store nodes and edges in PostgreSQL

### 9. Verify Installation

Run the health check:
```bash
npm run ml:health-check
```

Expected output:
```
✓ Ollama: Connected (llama3.2)
✓ ChromaDB: Connected (chanuka_constitutional collection)
✓ PostgreSQL: Connected (MWANGA schema ready)
✓ spaCy: Loaded (en_core_web_sm)
✓ NetworkX: Graph loaded (X nodes, Y edges)
```

## Testing the Setup

### Test Sentiment Analysis

```typescript
import { analyzeSentiment } from './features/ml/models';

const result = await analyzeSentiment(
  'This bill promotes transparency and accountability.'
);
console.log(result);
```

### Test Constitutional Analysis

```typescript
import { analyzeConstitutional } from './features/ml/models';

const result = await analyzeConstitutional(
  'Section 5: All citizens shall have access to healthcare services.',
  'Healthcare Access Bill 2026'
);
console.log(result);
```

## Development Workflow

### 1. Start All Services

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: ChromaDB
chroma run --host localhost --port 8000

# Terminal 3: Your app
npm run dev
```

### 2. Monitor Services

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Check ML health
curl http://localhost:3000/api/ml/health
```

### 3. View Logs

```bash
# Ollama logs
tail -f ~/.ollama/logs/server.log

# ChromaDB logs
# (Check terminal where chroma is running)

# App logs
npm run logs
```

## Production Deployment

### Option 1: Single Server (Recommended for MVP)

Deploy everything on one VPS (DigitalOcean, Railway, etc.):

1. **Server Requirements:**
   - 16GB RAM minimum
   - 4 CPU cores
   - 50GB SSD

2. **Setup:**
   ```bash
   # Install all services
   ./scripts/setup-production.sh
   
   # Start with systemd
   sudo systemctl start ollama
   sudo systemctl start chromadb
   sudo systemctl start chanuka-app
   ```

3. **Cost:** ~$20-40/month

### Option 2: Distributed (For Scale)

- App server: Railway/Render ($10/mo)
- Ollama server: Dedicated GPU instance ($50/mo)
- ChromaDB: Managed vector DB ($20/mo)
- PostgreSQL: Supabase free tier

## Troubleshooting

### Ollama Not Responding

```bash
# Check if running
ps aux | grep ollama

# Restart
ollama serve

# Check logs
tail -f ~/.ollama/logs/server.log
```

### ChromaDB Connection Failed

```bash
# Check if running
curl http://localhost:8000/api/v1/heartbeat

# Restart
chroma run --host localhost --port 8000
```

### Out of Memory

If Ollama crashes with OOM:
1. Use a smaller model: `ollama pull llama3.2:1b`
2. Increase swap space
3. Upgrade server RAM

### Slow Performance

1. **Enable caching:** Set `ML_CACHE_ENABLED=true`
2. **Use smaller models:** Switch to `mistral:7b` or `gemma:2b`
3. **Optimize ChromaDB:** Reduce embedding dimensions
4. **Add Redis:** Cache frequently accessed results

## Monitoring

### Prometheus Metrics

Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'mwanga'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/ml/metrics'
```

### Grafana Dashboard

Import the MWANGA dashboard:
```bash
# TODO: Create Grafana dashboard JSON
```

## Weekly Maintenance

### Engagement Model Retraining

Set up a cron job:
```bash
# Every Friday at 2 AM
0 2 * * 5 /usr/bin/npm run ml:retrain-engagement
```

### Conflict Graph Refresh

```bash
# Every night at 3 AM
0 3 * * * /usr/bin/npm run ml:refresh-conflict-graph
```

### Cache Cleanup

```bash
# Every Sunday at 4 AM
0 4 * * 0 /usr/bin/npm run ml:clear-old-cache
```

## Cost Breakdown

| Service | Cost |
|---------|------|
| VPS (16GB RAM) | $20-40/mo |
| Domain + SSL | $2/mo |
| Backups | $5/mo |
| **Total** | **~$27-47/mo** |

Compare to original plan: $350-$1,400/mo

**Savings: 92-98%**

## Next Steps

1. ✅ Complete database migration
2. ✅ Set up ML models structure
3. ⏳ Implement remaining analyzers (trojan-bill, conflict, engagement)
4. ⏳ Create initialization scripts
5. ⏳ Build API endpoints
6. ⏳ Add monitoring and metrics
7. ⏳ Write integration tests
8. ⏳ Deploy to staging

## Support

For issues or questions:
- Check logs first
- Review this guide
- Check MWANGA Stack documentation: `docs/architecture/ML_AI_ARCHITECTURE.md`
- Open an issue on GitHub

---

**Remember:** The MWANGA Stack is designed to be simple, local, and cost-effective. If something seems complicated or expensive, you're probably doing it wrong. Keep it simple.
