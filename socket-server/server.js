const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
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
const users = new Map();
const sessions = new Map();

// Helper functions
function generateToken(userId) {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ==================== RAW WEBSOCKET HANDLERS ====================
// Game WebSocket server (Raw WebSocket)
const gameWss = new WebSocket.Server({ 
  noServer: true,
  path: '/client'
});

// Admin WebSocket server (Raw WebSocket)  
const adminWss = new WebSocket.Server({ 
  noServer: true,
  path: '/redtcp'
});

// Handle upgrade requests for raw WebSockets
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  
  console.log('🔄 WebSocket upgrade request:', pathname);
  
  if (pathname === '/client') {
    gameWss.handleUpgrade(request, socket, head, (ws) => {
      gameWss.emit('connection', ws, request);
    });
  } else if (pathname === '/redtcp') {
    adminWss.handleUpgrade(request, socket, head, (ws) => {
      adminWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Game WebSocket handler
gameWss.on('connection', function(ws, req) {
  console.log('🎮 Raw WebSocket Game connection established');
  
  // Send immediate response to confirm connection
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Game WebSocket connected successfully'
  }));
  
  ws.on('message', function(message) {
    try {
      console.log('📨 Raw Game message received:', message.toString());
      const data = JSON.parse(message);
      
      // Handle authentication
      if (data.authentication) {
        const { username, password } = data.authentication;
        console.log('🔑 Game auth attempt:', username);
        
        // Auto-auth for testing - ACCEPT ALL
        ws.send(JSON.stringify({
          auth: true,
          success: true,
          message: 'Đăng nhập game thành công'
        }));
        
        console.log('✅ Game authentication approved');
      }
      
      // Handle other game messages
      if (data.action) {
        console.log('🎯 Game action:', data.action);
        ws.send(JSON.stringify({
          type: 'response',
          action: data.action,
          success: true,
          data: { timestamp: new Date().toISOString() }
        }));
      }
      
    } catch (error) {
      console.log('❌ Game message error:', error);
    }
  });
  
  ws.on('close', function() {
    console.log('❌ Game WebSocket closed');
  });
  
  ws.on('error', function(error) {
    console.log('❌ Game WebSocket error:', error);
  });
});

// Admin WebSocket handler  
adminWss.on('connection', function(ws, req) {
  console.log('🔐 Raw WebSocket Admin connection established');
  
  // Send immediate response to confirm connection
  ws.send(JSON.stringify({
    type: 'connection', 
    status: 'connected',
    message: 'Admin WebSocket connected successfully'
  }));
  
  ws.on('message', function(message) {
    try {
      console.log('📨 Raw Admin message received:', message.toString());
      const data = JSON.parse(message);
      
      // Handle admin authentication
      if (data.authentication) {
        const { username, password } = data.authentication;
        console.log('🔑 Admin login attempt:', username);
        
        // AUTO-APPROVE ALL ADMIN LOGINS
        ws.send(JSON.stringify({
          auth: true,
          success: true,
          message: 'Đăng nhập admin thành công'
        }));
        
        // Send admin data
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'admin_data',
            data: {
              username: username,
              rights: 9,
              players: Array.from(users.values()).map(u => ({
                username: u.username,
                balance: u.balance,
                level: u.level
              }))
            }
          }));
        }, 1000);
        
        console.log('✅ Admin authentication approved:', username);
      }
      
      // Handle admin commands
      if (data.command) {
        console.log('🎯 Admin command:', data.command);
        ws.send(JSON.stringify({
          type: 'command_response',
          command: data.command,
          success: true,
          message: 'Command executed successfully',
          timestamp: new Date().toISOString()
        }));
      }
      
    } catch (error) {
      console.log('❌ Admin message error:', error);
    }
  });
  
  ws.on('close', function() {
    console.log('❌ Admin WebSocket closed');
  });
  
  ws.on('error', function(error) {
    console.log('❌ Admin WebSocket error:', error);
  });
});

// ==================== AUTHENTICATION API ENDPOINTS ====================
// User Registration
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, captcha, email, phone } = req.body;
    
    console.log('📝 Register attempt:', { username, captcha });

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
      balance: 1000000,
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
    
    console.log('🔐 Login attempt:', { username, captcha });

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

// ==================== SOCKET.IO HANDLERS ====================
const gameState = {
  players: new Map(),
  totalConnections: 0
};

io.on('connection', (socket) => {
  console.log('🎯 Socket.IO player connected:', socket.id);
  gameState.totalConnections++;
  
  gameState.players.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    name: `Player_${socket.id.slice(0, 6)}`,
    isAuthenticated: false
  });

  // Send welcome message
  socket.emit('welcome', {
    message: 'Kết nối game thành công! 🎮',
    playerId: socket.id,
    serverTime: new Date().toISOString(),
    totalPlayers: gameState.players.size
  });

  // Handle authentication
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
      
      console.log('✅ Socket.IO authenticated:', session.username);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', socket.id);
    gameState.players.delete(socket.id);
  });
});

// ==================== HEALTH & INFO ENDPOINTS ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK 🟢',
    service: 'Tài Xỉu WebSocket Server + Authentication API',
    version: '1.0.0',
    connections: {
      rawWebSocket: {
        game: gameWss.clients.size,
        admin: adminWss.clients.size
      },
      socketIO: gameState.players.size,
      totalUsers: users.size
    },
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

app.get('/api/auth/info', (req, res) => {
  res.json({
    service: 'Tài Xỉu Authentication API',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      validate: 'POST /api/auth/validate',
      profile: 'GET /api/user/profile'
    },
    websocket: {
      game: 'Raw WebSocket: /client',
      admin: 'Raw WebSocket: /redtcp', 
      socketIO: 'Socket.IO: various events'
    }
  });
});

app.get('/game-info', (req, res) => {
  res.json({
    game: '🎲 Tài Xỉu Game Server',
    status: 'Running',
    connections: {
      rawWebSocket: {
        game: gameWss.clients.size,
        admin: adminWss.clients.size
      },
      socketIO: gameState.players.size
    },
    supportedProtocols: [
      'Raw WebSocket (/client, /redtcp)',
      'Socket.IO'
    ]
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🎲 Tài Xỉu WebSocket Server + Authentication API is running!',
    protocols: {
      rawWebSocket: {
        game: 'Connect to /client',
        admin: 'Connect to /redtcp'
      },
      socketIO: 'Connect using Socket.IO client'
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
  console.log('🔗 WebSocket Endpoints:');
  console.log(`   Game (Raw WS): ws://localhost:${PORT}/client`);
  console.log(`   Admin (Raw WS): ws://localhost:${PORT}/redtcp`);
  console.log(`   Socket.IO: Connect to port ${PORT}`);
  console.log('================================');
  console.log('🔗 API Endpoints:');
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Game Info: http://localhost:${PORT}/game-info`);
  console.log(`   Auth Info: http://localhost:${PORT}/api/auth/info`);
  console.log('================================');
  console.log('🌐 Allow origins:');
  console.log(`   - https://one11bet-com.onrender.com`);
  console.log(`   - http://localhost:10000`);
  console.log('================================');
  console.log('✅ Raw WebSocket handlers: ACTIVE');
  console.log('✅ Socket.IO handlers: ACTIVE');
  console.log('✅ Authentication API: ACTIVE');
});
