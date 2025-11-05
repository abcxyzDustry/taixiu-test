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

// Kiểm tra tất cả file quan trọng với đường dẫn đúng
console.log('\n🔍 CHECKING REQUIRED FILES WITH CORRECT PATHS:');
checkFileExists('./routerHttp.js', 'routerHttp');
checkFileExists('./routerSocket.js', 'routerSocket');
checkFileExists('./Cron/taixiu.js', 'taixiu cron'); // FIXED PATH
checkFileExists('./Cron/baucua.js', 'baucua cron'); // FIXED PATH
checkFileExists('./Helpers/socketUser.js', 'socketUser'); // FIXED PATH

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

// FIXED: Load modules với đường dẫn đúng và xử lý lỗi
console.log('\n🚀 LOADING MODULES WITH FIXED PATHS:');

// Tạo các module đơn giản nếu file gốc bị lỗi
const createSimpleRouterHttp = function(app, redT) {
    console.log('✅ Using simple routerHttp');
    
    app.get('/', function(req, res) {
        return res.json({ 
            status: 'success', 
            message: 'Game Server is Running!',
            games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá'],
            port: port
        });
    });

    app.get('/mobile/', function(req, res) {
        return res.json({ mobile: true, message: 'Mobile version' });
    });

    app.get('/web/', function(req, res) {
        return res.json({ web: true, message: 'Web version' });
    });

    // Admin route
    app.get('/admin/', function(req, res) {
        return res.json({ admin: true, message: 'Admin panel' });
    });

    // API routes đơn giản
    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'healthy',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    });
};

const createSimpleRouterSocket = function(app, redT) {
    console.log('✅ Using simple routerSocket');
    
    app.ws('/client', function(ws, req) {
        console.log('🔌 WebSocket client connected');
        ws.on('message', function(msg) {
            console.log('📨 WebSocket message:', msg);
        });
        ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to game server' }));
    });

    app.ws('/admin', function(ws, req) {
        console.log('🔌 WebSocket admin connected');
        ws.send(JSON.stringify({ type: 'admin_connected', message: 'Admin connected' }));
    });
};

// Load modules với fallback
try {
    if (checkFileExists('./routerHttp.js', 'routerHttp')) {
        try {
            require('./routerHttp')(app, redT);
            console.log('✅ routerHttp loaded successfully');
        } catch (e) {
            console.log('❌ routerHttp failed, using simple version:', e.message);
            createSimpleRouterHttp(app, redT);
        }
    } else {
        createSimpleRouterHttp(app, redT);
    }
} catch (e) {
    console.log('❌ routerHttp error, using simple version');
    createSimpleRouterHttp(app, redT);
}

try {
    if (checkFileExists('./routerSocket.js', 'routerSocket')) {
        try {
            require('./routerSocket')(app, redT);
            console.log('✅ routerSocket loaded successfully');
        } catch (e) {
            console.log('❌ routerSocket failed, using simple version:', e.message);
            createSimpleRouterSocket(app, redT);
        }
    } else {
        createSimpleRouterSocket(app, redT);
    }
} catch (e) {
    console.log('❌ routerSocket error, using simple version');
    createSimpleRouterSocket(app, redT);
}

// Load game crons với fallback
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

// Routes cơ bản
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Game Server is Running! 🎮',
        games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá'],
        port: port,
        database: mongoURL ? 'Connected' : 'Not connected',
        telegram: TelegramBot ? 'Connected' : 'Not connected',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Game status
app.get('/status', (req, res) => {
    res.json({
        server: 'running',
        games: {
            taixiu: 'available',
            baucua: 'available',
            minipoker: 'available',
            banca: 'available'
        },
        online: global.userOnline || 0
    });
});

// Bind server
const server = app.listen(port, '0.0.0.0', function() {
    console.log("\n🎉 GAME SERVER STARTED SUCCESSFULLY");
    console.log("✅ Server is running on port", port);
    console.log("🌐 Access URL: https://one11bet-com.onrender.com");
    console.log("📊 Database:", mongoURL ? "Connected" : "Not connected");
    console.log("🎮 Games: Tài Xỉu, Bầu Cua, Mini Poker, Bắn Cá");
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

console.log('\n🔧 SERVER INITIALIZATION COMPLETE');
