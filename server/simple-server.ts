import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'simple-server' });
});

// Optionally export for testing or integration
export default app;

if (require.main === module || process.argv[1].endsWith('simple-server.ts')) {
  app.listen(PORT, () => {
    console.log(`Simple server running on port ${PORT}`);
  });
}
