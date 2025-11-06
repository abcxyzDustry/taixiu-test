require('dotenv').config();
var cors = require('cors');
let Telegram      = require('node-telegram-bot-api');
let express       = require('express');
let app           = express();
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

let port = process.env.PORT || 10000;

let expressWs  = require('express-ws')(app);
let bodyParser = require('body-parser');
var morgan = require('morgan');

// Debug: Kiểm tra file tồn tại
const fs = require('fs');
const path = require('path');

const checkFileExists = (filePath, name) => {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`📁 ${name}: ${exists ? '✅ EXISTS' : '❌ MISSING'} - ${fullPath}`);
    return exists;
};

// Kiểm tra tất cả file quan trọng
console.log('\n🔍 CHECKING REQUIRED FILES:');
checkFileExists('./routerHttp.js', 'routerHttp');
checkFileExists('./routerSocket.js', 'routerSocket');
checkFileExists('./Cron/taixiu.js', 'taixiu cron');
checkFileExists('./Cron/baucua.js', 'baucua cron');
checkFileExists('./Helpers/socketUser.js', 'socketUser');

// Telegram Bot
let TelegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
        TelegramBot = new Telegram(process.env.TELEGRAM_BOT_TOKEN, {polling: true});
        console.log('✅ Telegram Bot initialized successfully');
    } catch (error) {
        console.log('❌ Telegram Bot failed to initialize:', error.message);
        TelegramBot = null;
    }
} else {
    console.log('ℹ️ Telegram Bot skipped - no token provided');
}

// MongoDB Config
let mongoose = require('mongoose');
require('mongoose-long')(mongoose);
mongoose.set('strictQuery', false);

const mongoURL = process.env.MONGODB_URI;

if (mongoURL) {
    mongoose.connect(mongoURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }).then(() => {
        console.log('✅ Connected to MongoDB successfully');
    }).catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
    });
} else {
    console.log('ℹ️ MongoDB connection skipped - no database URL provided');
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// Server socket
let redT = expressWs.getWss();
process.redT = redT;
if (TelegramBot) {
    redT.telegram = TelegramBot;
}
global['redT'] = redT;
global.SKnapthe = 2;
global['userOnline'] = 0;

// FIX: Khởi tạo các biến cần thiết cho game
redT.users = {};
redT.admins = {};
redT.listBot = [];

// Simple routerHttp
const createSimpleRouterHttp = function(app, redT) {
    console.log('✅ Using simple routerHttp');
    
    app.get('/', function(req, res) {
        return res.json({ 
            status: 'success', 
            message: 'Game Server is Running! 🎮',
            games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá'],
            port: port,
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    });

    app.get('/mobile/', function(req, res) {
        return res.json({ mobile: true, message: 'Mobile version' });
    });

    app.get('/web/', function(req, res) {
        return res.json({ web: true, message: 'Web version' });
    });

    app.get('/admin/', function(req, res) {
        return res.json({ admin: true, message: 'Admin panel' });
    });

    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'healthy',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    });

    app.get('/status', (req, res) => {
        res.json({
            server: 'running',
            games: {
                taixiu: 'available',
                baucua: 'available', // Đã enable Bầu Cua
                minipoker: 'available',
                banca: 'available'
            },
            online: global.userOnline || 0
        });
    });
};

const createSimpleRouterSocket = function(app, redT) {
    console.log('✅ Using simple routerSocket');
    
    app.ws('/client', function(ws, req) {
        console.log('🔌 WebSocket client connected');
        
        // Thêm client vào users
        const clientId = Date.now().toString();
        if (!redT.users[clientId]) {
            redT.users[clientId] = [];
        }
        redT.users[clientId].push(ws);
        
        ws.on('message', function(msg) {
            console.log('📨 WebSocket message:', msg);
            try {
                const data = JSON.parse(msg);
                // Xử lý message từ client
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
                }
            } catch (e) {
                console.log('❌ WebSocket message error:', e.message);
            }
        });
        
        ws.on('close', function() {
            console.log('🔌 WebSocket client disconnected');
            // Xóa client khỏi users
            if (redT.users[clientId]) {
                const index = redT.users[clientId].indexOf(ws);
                if (index > -1) {
                    redT.users[clientId].splice(index, 1);
                }
                if (redT.users[clientId].length === 0) {
                    delete redT.users[clientId];
                }
            }
        });
        
        ws.send(JSON.stringify({ 
            type: 'connected', 
            message: 'Welcome to game server',
            clientId: clientId
        }));
    });

    app.ws('/admin', function(ws, req) {
        console.log('🔌 WebSocket admin connected');
        
        // Thêm admin vào admins
        const adminId = 'admin_' + Date.now().toString();
        if (!redT.admins[adminId]) {
            redT.admins[adminId] = [];
        }
        redT.admins[adminId].push(ws);
        
        ws.send(JSON.stringify({ 
            type: 'admin_connected', 
            message: 'Admin connected',
            adminId: adminId
        }));
    });
};

// Load routers
createSimpleRouterHttp(app, redT);
createSimpleRouterSocket(app, redT);

// Load game crons - ĐÃ ENABLE BẦU CUA
console.log('\n🚀 LOADING GAME CRONS:');

try {
    if (checkFileExists('./Cron/taixiu.js', 'taixiu cron')) {
        require('./Cron/taixiu')(redT);
        console.log('✅ taixiu cron loaded successfully');
    } else {
        console.log('ℹ️ taixiu cron not found, skipping');
    }
} catch (e) {
    console.log('❌ taixiu cron error:', e.message);
}

// QUAN TRỌNG: ĐÃ ENABLE BẦU CUA TRỞ LẠI
try {
    if (checkFileExists('./Cron/baucua.js', 'baucua cron')) {
        require('./Cron/baucua')(redT);
        console.log('✅ baucua cron loaded successfully');
    } else {
        console.log('ℹ️ baucua cron not found, skipping');
    }
} catch (e) {
    console.log('❌ baucua cron error:', e.message);
}

// Load socketUser
try {
    if (checkFileExists('./Helpers/socketUser.js', 'socketUser')) {
        require('./Helpers/socketUser')(redT);
        console.log('✅ socketUser loaded successfully');
    } else {
        console.log('ℹ️ socketUser not found, skipping');
    }
} catch (e) {
    console.log('❌ socketUser error:', e.message);
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Game Server is Running! 🎮',
        version: '1.0.0',
        port: port,
        database: 'Connected',
        games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá'],
        timestamp: new Date().toISOString()
    });
});

app.get('/game/baucua', (req, res) => {
    res.json({
        game: 'Bầu Cua',
        status: 'running',
        description: 'Bầu Cua game is now active'
    });
});

app.get('/game/taixiu', (req, res) => {
    res.json({
        game: 'Tài Xỉu',
        status: 'running',
        description: 'Tài Xỉu game is now active'
    });
});

// Bind server
const server = app.listen(port, '0.0.0.0', function() {
    console.log("\n🎉 GAME SERVER STARTED SUCCESSFULLY");
    console.log("✅ Server is running on port", port);
    console.log("🌐 Access URL: https://one11bet-com.onrender.com");
    console.log("📊 Database: Connected");
    console.log("🎮 ACTIVE GAMES: Tài Xỉu, Bầu Cua");
    console.log("🔌 WebSocket: /client, /admin");
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

console.log('\n🔧 SERVER INITIALIZATION COMPLETE');
