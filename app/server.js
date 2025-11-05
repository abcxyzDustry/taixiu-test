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

// Load modules với try-catch
const loadModule = (path, name) => {
    try {
        require(path)(app, redT);
        console.log(`✅ ${name} loaded successfully`);
    } catch (e) {
        console.log(`❌ ${name} not found:`, e.message);
    }
};

loadModule('./app/Helpers/socketUser', 'socketUser');
loadModule('./routerHttp', 'routerHttp');
loadModule('./routerCMS', 'routerCMS');
loadModule('./routerSocket', 'routerSocket');
loadModule('./app/Cron/taixiu', 'taixiu cron');
loadModule('./app/Cron/baucua', 'baucua cron');

try {
    require('./config/cron')();
    console.log('✅ cron config loaded successfully');
} catch (e) {
    console.log('❌ cron config not found:', e.message);
}

if (TelegramBot) {
    try {
        require('./app/Telegram/Telegram')(redT);
        console.log('✅ Telegram bot loaded successfully');
    } catch (e) {
        console.log('❌ Telegram bot module not found:', e.message);
    }
}

// Routes cơ bản
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is running!',
        port: port,
        database: mongoURL ? 'Connected' : 'Not connected',
        telegram: TelegramBot ? 'Connected' : 'Not connected'
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
    console.log("✅ Server is running on port", port);
    console.log("🌐 Server bound to 0.0.0.0 for Render detection");
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
