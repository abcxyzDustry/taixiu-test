const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration - Allow your game domain
app.use(cors({
  origin: [
    "https://one11bet-com.onrender.com",
    "http://localhost:10000",
    "http://127.0.0.1:10000"
  ],
  credentials: true
}));

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: [
      "https://one11bet-com.onrender.com",
      "http://localhost:10000", 
      "http://127.0.0.1:10000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Store game data
const gameState = {
  players: new Map(),
  totalConnections: 0
};

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('🎯 New player connected:', socket.id);
  gameState.totalConnections++;
  
  // Add player to game state
  gameState.players.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    name: `Player_${socket.id.slice(0, 6)}`,
    score: 0,
    position: { x: 0, y: 0 }
  });

  // Send welcome message to the new player
  socket.emit('welcome', {
    message: 'Kết nối game thành công! 🎮',
    playerId: socket.id,
    serverTime: new Date().toISOString(),
    totalPlayers: gameState.players.size
  });

  // Notify all players about new connection
  socket.broadcast.emit('player_joined', {
    playerId: socket.id,
    playerName: `Player_${socket.id.slice(0, 6)}`,
    totalPlayers: gameState.players.size,
    timestamp: new Date().toISOString()
  });

  // Handle player movement
  socket.on('player_move', (data) => {
    console.log('👤 Player move:', socket.id, data);
    
    // Update player position
    const player = gameState.players.get(socket.id);
    if (player && data.position) {
      player.position = data.position;
    }
    
    // Broadcast to other players
    socket.broadcast.emit('player_moved', {
      playerId: socket.id,
      position: data.position,
      timestamp: new Date().toISOString()
    });
  });

  // Handle game actions (Tài Xỉu specific)
  socket.on('bet_placed', (data) => {
    console.log('💰 Bet placed:', socket.id, data);
    
    io.emit('bet_update', {
      playerId: socket.id,
      playerName: data.playerName || `Player_${socket.id.slice(0, 6)}`,
      betType: data.betType, // 'tai' or 'xiu'
      amount: data.amount,
      timestamp: new Date().toISOString()
    });
  });

  // Handle game result
  socket.on('game_result', (data) => {
    console.log('🎲 Game result:', data);
    
    io.emit('result_announcement', {
      result: data.result, // 'tai' or 'xiu'
      dice: data.dice, // [1,2,3]
      winners: data.winners,
      timestamp: new Date().toISOString()
    });
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    console.log('💬 Chat message:', socket.id, data);
    
    io.emit('chat_message', {
      playerId: socket.id,
      playerName: data.playerName || `Player_${socket.id.slice(0, 6)}`,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle score updates
  socket.on('score_update', (data) => {
    console.log('⭐ Score update:', socket.id, data);
    
    const player = gameState.players.get(socket.id);
    if (player && data.score !== undefined) {
      player.score = data.score;
    }
    
    io.emit('leaderboard_update', {
      leaderboard: Array.from(gameState.players.values())
        .map(p => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log('❌ Player disconnected:', socket.id, 'Reason:', reason);
    
    gameState.players.delete(socket.id);
    
    // Notify all players
    io.emit('player_left', {
      playerId: socket.id,
      totalPlayers: gameState.players.size,
      timestamp: new Date().toISOString()
    });
  });

  // Send current game state to new player
  socket.emit('game_state', {
    players: Array.from(gameState.players.values()),
    totalPlayers: gameState.players.size,
    serverTime: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK 🟢',
    service: 'Tài Xỉu WebSocket Server',
    version: '1.0.0',
    totalPlayers: gameState.players.size,
    totalConnections: gameState.totalConnections,
    uptime: Math.floor(process.uptime()) + ' seconds',
    timestamp: new Date().toISOString()
  });
});

// Game info endpoint
app.get('/game-info', (req, res) => {
  const players = Array.from(gameState.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    connectedAt: player.connectedAt,
    onlineFor: Math.floor((new Date() - player.connectedAt) / 1000) + 's'
  }));

  res.json({
    game: '🎲 Tài Xỉu Game Server',
    status: 'Running',
    websocketUrl: 'Connect via Socket.IO client',
    statistics: {
      onlinePlayers: gameState.players.size,
      totalConnections: gameState.totalConnections,
      uptime: Math.floor(process.uptime()) + ' seconds'
    },
    onlinePlayers: players,
    supportedEvents: [
      'player_move', 
      'bet_placed',
      'game_result', 
      'chat_message',
      'score_update',
      'welcome',
      'player_joined',
      'player_left',
      'bet_update',
      'result_announcement',
      'leaderboard_update'
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎲 Tài Xỉu WebSocket Server is running!',
    game: 'Tài Xỉu (Sic Bo)',
    endpoints: {
      health: '/health',
      gameInfo: '/game-info',
      websocket: 'Connect using Socket.IO client to port ' + PORT
    },
    exampleConnection: 'Use: socket.io-client to connect to this server'
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 TÀI XỈU WEBSOCKET SERVER STARTED');
  console.log('================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🎮 Game: Tài Xỉu (Sic Bo)`);
  console.log('================================');
  console.log('🔗 Endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Game Info: http://localhost:${PORT}/game-info`);
  console.log(`   WebSocket: Connect via Socket.IO client`);
  console.log('================================');
  console.log('🌐 Allow origins:');
  console.log(`   - https://one11bet-com.onrender.com`);
  console.log(`   - http://localhost:10000`);
  console.log('================================');
});
