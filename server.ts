import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './server/api';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Mount API router
app.use('/api', createApiRouter());

// Serve static frontend files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[CodeX-Ray] Server running on http://0.0.0.0:${port}`);
});
