// ============================================================================
// ML MODEL TEST SERVER - External Testing Interface
// ============================================================================
// Standalone server for testing ML models externally via HTTP API

import express from 'express';
import cors from 'cors';
import { mlOrchestrator, analysisPipeline } from '../index';

const app: express.Application = express();
const PORT = process.env.ML_TEST_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const health = await mlOrchestrator.healthCheck();
    const allHealthy = Object.values(health).every(Boolean);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      models: health,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available models
app.get('/models', (_req, res) => {
  const models = mlOrchestrator.getAvailableModels();
  res.json({
    success: true,
    models: models.map(model => ({
      type: model.type,
      name: model.info?.name,
      version: model.info?.version,
      description: model.info?.description,
      capabilities: model.info?.capabilities,
    }))
  });
});

// Get available pipelines
app.get('/pipelines', (_req, res) => {
  const pipelines = analysisPipeline.getAvailablePipelines();
  res.json({
    success: true,
    pipelines
  });
});

// Test individual models
app.post('/test/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    const { input, options = {} } = req.body;

    const result = await mlOrchestrator.processRequest({
      modelType: modelType as any,
      input,
      options: {
        async: false,
        priority: 'normal',
        timeout: 60000,
        cacheResults: false,
        ...options
      }
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quick test endpoints with sample data
app.get('/quick-test/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    const sampleInput = getSampleInput(modelType);

    if (!sampleInput) {
      res.status(400).json({
        success: false,
        error: `No sample data available for model: ${modelType}`
      });
      return;
    }

    const result = await mlOrchestrator.processRequest({
      modelType: modelType as any,
      input: sampleInput,
      options: {
        async: false,
        priority: 'normal',
        timeout: 30000,
        cacheResults: false
      }
    });

    res.json({
      ...result,
      sampleInput
    });
    return;
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

// Sample input generator
function getSampleInput(modelType: string) {
  const sampleInputs: Record<string, any> = {
    'trojan-bill-detector': {
      billText: `The Kenya Finance Amendment Bill 2024
        
        Section 5: The minister may, without parliamentary oversight, impose additional taxes as deemed necessary.
        Section 47: Notwithstanding any other law, the Cabinet Secretary may make regulations.`,
      billTitle: 'Kenya Finance Amendment Bill 2024',
      pageCount: 89,
      scheduleCount: 3,
      amendmentCount: 15,
      consultationPeriod: 14,
      urgencyLevel: 'urgent' as const,
    },
    
    'constitutional-analyzer': {
      billText: `Section 3: Any person who organizes a public gathering without prior approval shall be guilty of an offense.`,
      billTitle: 'Public Order Amendment Bill 2024',
      billType: 'public' as const,
    },
    
    'sentiment-analyzer': {
      text: 'This new bill is absolutely terrible! The government is trying to hurt citizens.',
      context: 'bill_comment' as const,
      language: 'en' as const,
    }
  };

  return sampleInputs[modelType];
}

// Interactive testing interface (HTML page)
app.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ML Models Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .model-card { border: 1px solid #ddd; padding: 15px; margin: 10px; border-radius: 8px; }
        button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        textarea { width: 100%; height: 200px; padding: 10px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ML Models Test Interface</h1>
        
        <div id="models"></div>
        
        <div>
            <h3>Custom Test</h3>
            <textarea id="input" placeholder="Enter JSON input..."></textarea>
            <br>
            <select id="modelSelect"></select>
            <button onclick="runTest()">Run Test</button>
        </div>
        
        <div>
            <h4>Output:</h4>
            <pre id="output">Results will appear here...</pre>
        </div>
    </div>

    <script>
        let models = [];

        window.onload = async function() {
            const response = await fetch('/models');
            const data = await response.json();
            models = data.models;
            
            const modelsDiv = document.getElementById('models');
            const select = document.getElementById('modelSelect');
            
            models.forEach(model => {
                const card = document.createElement('div');
                card.className = 'model-card';
                card.innerHTML = \`
                    <h3>\${model.name}</h3>
                    <p>\${model.description}</p>
                    <button onclick="quickTest('\${model.type}')">Quick Test</button>
                \`;
                modelsDiv.appendChild(card);
                
                const option = document.createElement('option');
                option.value = model.type;
                option.textContent = model.name;
                select.appendChild(option);
            });
        };

        async function quickTest(modelType) {
            const output = document.getElementById('output');
            output.textContent = 'Running test...';
            
            try {
                const response = await fetch(\`/quick-test/\${modelType}\`);
                const data = await response.json();
                output.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
            }
        }

        async function runTest() {
            const input = document.getElementById('input').value;
            const modelType = document.getElementById('modelSelect').value;
            const output = document.getElementById('output');
            
            try {
                const inputData = JSON.parse(input);
                output.textContent = 'Running test...';
                
                const response = await fetch(\`/test/\${modelType}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: inputData })
                });
                
                const data = await response.json();
                output.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
  `);
});

// Start server
async function startServer() {
  try {
    console.log('Warming up ML models...');
    await mlOrchestrator.warmUp();
    
    app.listen(PORT, () => {
      console.log(`🚀 ML Test Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🧪 Test interface: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app, startServer };