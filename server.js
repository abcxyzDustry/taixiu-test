require('dotenv').config();
var cors = require('cors');
let Telegram      = require('node-telegram-bot-api');
let express       = require('express');
let app           = express();
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

// FIX: Sử dụng PORT từ Render environment
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

// Debug: Xem cấu trúc thư mục
console.log('📂 PROJECT STRUCTURE ON RENDER:');
const showStructure = (dir, depth = 0) => {
    const prefix = '  '.repeat(depth);
    try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                console.log(prefix + '📁 ' + item);
                if (depth < 2) { // Giới hạn depth để không quá nhiều log
                    showStructure(fullPath, depth + 1);
                }
            } else {
                console.log(prefix + '📄 ' + item);
            }
        });
    } catch (e) {
        console.log(prefix + '❌ Cannot read:', dir);
    }
};

showStructure(__dirname);

// Kiểm tra tất cả file quan trọng
console.log('\n🔍 CHECKING REQUIRED FILES:');
checkFileExists('./routerHttp.js', 'routerHttp');
checkFileExists('./routerSocket.js', 'routerSocket');
checkFileExists('./app/Cron/taixiu.js', 'taixiu cron');
checkFileExists('./app/Cron/baucua.js', 'baucua cron');
checkFileExists('./config/cron.js', 'cron config');
checkFileExists('./app/Helpers/socketUser.js', 'socketUser');
checkFileExists('./config/admin.js', 'admin config');

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

// Load modules với debug chi tiết
console.log('\n🚀 LOADING MODULES:');
const loadModule = (path, name) => {
    try {
        if (checkFileExists(path, name)) {
            require(path)(app, redT);
            console.log(`✅ ${name} loaded successfully`);
        } else {
            console.log(`❌ ${name} file not found`);
        }
    } catch (e) {
        console.log(`❌ ${name} error:`, e.message);
        console.log(`🔍 ${name} stack:`, e.stack);
    }
};

loadModule('./routerHttp.js', 'routerHttp');
loadModule('./routerSocket.js', 'routerSocket');
loadModule('./app/Cron/taixiu.js', 'taixiu cron');
loadModule('./app/Cron/baucua.js', 'baucua cron');

try {
    if (checkFileExists('./config/cron.js', 'cron config')) {
        require('./config/cron')();
        console.log('✅ cron config loaded successfully');
    }
} catch (e) {
    console.log('❌ cron config error:', e.message);
}

try {
    if (checkFileExists('./app/Helpers/socketUser.js', 'socketUser')) {
        require('./app/Helpers/socketUser')(redT);
        console.log('✅ socketUser loaded successfully');
    }
} catch (e) {
    console.log('❌ socketUser error:', e.message);
}

if (TelegramBot) {
    try {
        if (checkFileExists('./app/Telegram/Telegram.js', 'Telegram bot')) {
            require('./app/Telegram/Telegram')(redT);
            console.log('✅ Telegram bot loaded successfully');
        }
    } catch (e) {
        console.log('❌ Telegram bot module error:', e.message);
    }
}

// Routes cơ bản
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is running!',
        port: port,
        database: mongoURL ? 'Connected' : 'Not connected',
        telegram: TelegramBot ? 'Connected' : 'Not connected',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// FIX: Bind to 0.0.0.0 để Render detect port
const server = app.listen(port, '0.0.0.0', function() {
    console.log("\n🎉 SERVER STARTED SUCCESSFULLY");
    console.log("✅ Server is running on port", port);
    console.log("🌐 Server bound to 0.0.0.0 for Render detection");
    console.log("📊 Database:", mongoURL ? "Configured" : "Not configured");
    console.log("🤖 Telegram Bot:", TelegramBot ? "Connected" : "Not connected");
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

console.log('\n🔧 SERVER INITIALIZATION COMPLETE');
