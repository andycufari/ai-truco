// HayTruco Server
// WebSocket + Express server for real-time game updates

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import GameOrchestrator from './game/orchestrator.js';
import { AIManager, OpenAIProvider, ClaudeProvider, OllamaProvider, DeepSeekProvider, GeminiProvider } from './lib/ai-manager.js';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize AI Manager
const aiManager = new AIManager();

// Register providers if API keys exist
if (process.env.OPENAI_API_KEY) {
  aiManager.registerProvider('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
}
if (process.env.ANTHROPIC_API_KEY) {
  aiManager.registerProvider('claude', new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
}
if (process.env.DEEPSEEK_API_KEY) {
  aiManager.registerProvider('deepseek', new DeepSeekProvider(process.env.DEEPSEEK_API_KEY));
}
if (process.env.GEMINI_API_KEY) {
  aiManager.registerProvider('gemini', new GeminiProvider(process.env.GEMINI_API_KEY));
}
// Ollama doesn't need API key
aiManager.registerProvider('ollama', new OllamaProvider());

// Game instances (room-based)
const games = new Map();

// Logging setup
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for the current session
const sessionId = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `game-${sessionId}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Custom logging function
function gameLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    data
  };
  
  // Write to file
  logStream.write(JSON.stringify(logEntry) + '\n');
  
  // Also log to console
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

console.log(`\n📝 Logging session to: ${logFile}\n`);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('create_game', (config) => {
    const roomId = generateRoomId();
    const orchestrator = new GameOrchestrator(
      aiManager, 
      // Update callback
      (state) => {
        io.to(roomId).emit('game_update', state);
        // Log game state updates
        gameLog('Game state update', {
          roomId,
          score: state.score,
          currentTurn: state.currentTurn,
          trucoState: state.trucoState,
          envidoState: state.envidoState,
          roundWins: state.roundWins,
          tableCards: state.table.length,
          lastAction: state.history[state.history.length - 1]
        });
      },
      // Log callback
      (message, data) => {
        gameLog(message, { roomId, ...data });
      }
    );

    games.set(roomId, orchestrator);
    socket.join(roomId);

    socket.emit('game_created', { roomId });
    gameLog('Game created', { roomId });
  });

  socket.on('join_game', (roomId) => {
    if (games.has(roomId)) {
      socket.join(roomId);
      socket.emit('game_joined', { roomId });
    } else {
      socket.emit('error', { message: 'Game not found' });
    }
  });

  socket.on('start_game', ({ roomId, players }) => {
    const game = games.get(roomId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Setup and start game
    gameLog('Starting game', { 
      roomId, 
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        aiProvider: p.aiProvider,
        model: p.model,
        personality: p.personality
      }))
    });
    game.setupGame(players);
    game.startGame().catch(err => {
      console.error('Game error:', err);
      gameLog('Game error', { roomId, error: err.message });
      io.to(roomId).emit('game_error', { message: err.message });
    });
  });

  socket.on('stop_game', ({ roomId }) => {
    const game = games.get(roomId);
    if (game) {
      gameLog('Game stopped by user', { roomId });
      game.stopGame();
      games.delete(roomId);
      io.to(roomId).emit('game_stopped');
    }
  });

  socket.on('update_speed', ({ roomId, speed }) => {
    const game = games.get(roomId);
    if (game) {
      game.turnDelay = speed;
      gameLog('Game speed updated', { roomId, newSpeed: speed });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    gameLog('Client disconnected', { socketId: socket.id });
  });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    providers: Array.from(aiManager.providers.keys()) 
  });
});

app.get('/api/providers', (req, res) => {
  const providers = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'] },
    { id: 'claude', name: 'Claude', models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
    { id: 'gemini', name: 'Gemini', models: ['gemini-pro', 'gemini-pro-vision'] },
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama2', 'mistral', 'codellama'] }
  ];

  // Filter by available providers
  const available = providers.filter(p => aiManager.providers.has(p.id));
  res.json(available);
});

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`HayTruco server running on port ${PORT}`);
  console.log(`Available AI providers: ${Array.from(aiManager.providers.keys()).join(', ')}`);
  gameLog('Server started', { 
    port: PORT, 
    providers: Array.from(aiManager.providers.keys()) 
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  gameLog('Server shutting down', {});
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  gameLog('Server shutting down', {});
  logStream.end();
  process.exit(0);
});
