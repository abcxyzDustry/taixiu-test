const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: [
    "https://one11bet-com.onrender.com",
    "http://localhost:10000",
    "http://127.0.0.1:10000"
  ],
  credentials: true
}));

// Middleware để parse JSON
app.use(express.json());

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

// ==================== AUTHENTICATION DATABASE ====================
// Mock database (trong thực tế dùng MongoDB/MySQL)
const users = new Map();
const sessions = new Map();

// Helper functions
function generateToken(userId) {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ==================== AUTHENTICATION API ENDPOINTS ====================
// User Registration
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, captcha, email, phone } = req.body;
    
    console.log('📝 Register attempt:', { 
      username, 
      captcha,
      hasPassword: !!password 
    });

    // Validation
    if (!username || !password) {
      return res.json({
        success: false,
        message: 'Tên đăng nhập và mật khẩu không được để trống'
      });
    }

    if (username.length < 3) {
      return res.json({
        success: false,
        message: 'Tên đăng nhập phải có ít nhất 3 ký tự'
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Check if user exists
    if (users.has(username)) {
      return res.json({
        success: false,
        message: 'Tên đăng nhập đã tồn tại'
      });
    }

    // Create new user
    const user = {
      id: generateToken(username),
      username,
      password: hashPassword(password),
      email: email || '',
      phone: phone || '',
      balance: 1000000, // Starting balance
      level: 1,
      createdAt: new Date(),
      lastLogin: new Date(),
      isOnline: false
    };

    users.set(username, user);

    console.log('✅ User registered successfully:', username);

    res.json({
      success: true,
      message: 'Đăng ký thành công!',
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        level: user.level,
        token: generateToken(username)
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại'
    });
  }
});

// User Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password, captcha } = req.body;
    
    console.log('🔐 Login attempt:', { 
      username, 
      captcha,
      hasPassword: !!password 
    });

    // Validation
    if (!username || !password) {
      return res.json({
        success: false,
        message: 'Tên đăng nhập và mật khẩu không được để trống'
      });
    }

    // Check user exists
    const user = users.get(username);
    if (!user) {
      return res.json({
        success: false,
        message: 'Tên đăng nhập không tồn tại'
      });
    }

    // Check password
    if (user.password !== hashPassword(password)) {
      return res.json({
        success: false,
        message: 'Mật khẩu không đúng'
      });
    }

    // Update user status
    user.lastLogin = new Date();
    user.isOnline = true;

    // Generate session token
    const token = generateToken(username);
    sessions.set(token, {
      userId: user.id,
      username: user.username,
      loginTime: new Date()
    });

    console.log('✅ User logged in successfully:', username);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        level: user.level,
        token: token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.json({
      success: false,
      message: 'Lỗi hệ thống, vui lòng thử lại'
    });
  }
});

// Check Token Validation
app.post('/api/auth/validate', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ valid: false });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.json({ valid: false });
    }

    res.json({ 
      valid: true,
      user: {
        username: session.username
      }
    });

  } catch (error) {
    res.json({ valid: false });
  }
});

// Get User Profile
app.get('/api/user/profile', (req, res) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = users.get(session.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    username: user.username,
    balance: user.balance,
    level: user.level,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  });
});

// ==================== GAME MANAGEMENT ====================
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
    position: { x: 0, y: 0 },
    isAuthenticated: false
  });

  // Send welcome message to the new player
  socket.emit('welcome', {
    message: 'Kết nối game thành công! 🎮',
    playerId: socket.id,
    serverTime: new Date().toISOString(),
    totalPlayers: gameState.players.size
  });

  // Handle authentication via socket
  socket.on('authenticate', (data) => {
    const { token } = data;
    const session = sessions.get(token);
    
    if (session) {
      const player = gameState.players.get(socket.id);
      player.isAuthenticated = true;
      player.username = session.username;
      
      socket.emit('authentication_success', {
        message: 'Xác thực thành công!',
        user: session
      });
      
      console.log('✅ Socket authenticated:', session.username);
    } else {
      socket.emit('authentication_failed', {
        message: 'Token không hợp lệ'
      });
    }
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
});

// ==================== HEALTH & INFO ENDPOINTS ====================
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK 🟢',
    service: 'Tài Xỉu WebSocket Server + Authentication API',
    version: '1.0.0',
    totalPlayers: gameState.players.size,
    totalUsers: users.size,
    totalConnections: gameState.totalConnections,
    uptime: Math.floor(process.uptime()) + ' seconds',
    timestamp: new Date().toISOString()
  });
});

// Auth API info endpoint
app.get('/api/auth/info', (req, res) => {
  res.json({
    service: 'Tài Xỉu Authentication API',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      validate: 'POST /api/auth/validate',
      profile: 'GET /api/user/profile'
    },
    statistics: {
      totalUsers: users.size,
      totalSessions: sessions.size,
      onlinePlayers: gameState.players.size
    }
  });
});

// Game info endpoint
app.get('/game-info', (req, res) => {
  const players = Array.from(gameState.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    score: player.score,
    authenticated: player.isAuthenticated,
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
      'authenticate',
      'welcome',
      'player_joined',
      'player_left'
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎲 Tài Xỉu WebSocket Server + Authentication API is running!',
    game: 'Tài Xỉu (Sic Bo)',
    endpoints: {
      health: '/health',
      gameInfo: '/game-info',
      authInfo: '/api/auth/info',
      websocket: 'Connect using Socket.IO client to port ' + PORT
    },
    authentication: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login'
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 TÀI XỈU WEBSOCKET SERVER + AUTH API STARTED');
  console.log('================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🎮 Game: Tài Xỉu (Sic Bo)`);
  console.log(`🔐 Authentication: Enabled`);
  console.log('================================');
  console.log('🔗 API Endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Game Info: http://localhost:${PORT}/game-info`);
  console.log(`   Auth Info: http://localhost:${PORT}/api/auth/info`);
  console.log(`   Register: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log('================================');
  console.log('🌐 Allow origins:');
  console.log(`   - https://one11bet-com.onrender.com`);
  console.log(`   - http://localhost:10000`);
  console.log('================================');
});
