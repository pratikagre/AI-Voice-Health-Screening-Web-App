import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { config } from './config/env.js';
import { setupCallWebSocket } from './websocket/callHandler.js';

const app = express();

// Configure CORS to allow frontend connections
app.use(cors({
  origin: '*', // In production, replace with specific domain
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Basic health check routes
app.get('/', (req, res) => {
  res.send('<h1>🎙️ AI Voice Health Screening Backend</h1><p>The backend server and WebSocket connection are active. Please open the React client interface at <a href="http://localhost:5173">http://localhost:5173</a> to start your voice health screening call.</p>');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeys: {
      gemini: !!config.GEMINI_API_KEY,
      openai: !!config.OPENAI_API_KEY,
    }
  });
});

// Bind HTTP server
const httpServer = createServer(app);

// Bind WebSocket server
const wss = new WebSocketServer({ server: httpServer });
setupCallWebSocket(wss);

httpServer.listen(config.PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Server running on http://localhost:${config.PORT}`);
  console.log(`🔌 WebSocket server active on ws://localhost:${config.PORT}`);
  console.log(`===============================================`);
});
