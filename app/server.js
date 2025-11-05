require('dotenv').config();
var cors = require('cors');
let Telegram      = require('node-telegram-bot-api');
let express       = require('express');
let app           = express();
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));
let port       = process.env.PORT || 10000;
let expressWs  = require('express-ws')(app);
let bodyParser = require('body-parser');
var morgan = require('morgan');

// FIXED: Chỉ khởi tạo Telegram Bot nếu có token hợp lệ
let TelegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== '1994240179:AAGmDQfq2EUrAtdVkdsABmp7tvgBNkqbrWs') {
    try {
        TelegramBot = new Telegram(process.env.TELEGRAM_BOT_TOKEN, {polling: true});
        console.log('Telegram Bot initialized successfully');
    } catch (error) {
        console.log('Telegram Bot failed to initialize:', error.message);
        TelegramBot = null;
    }
} else {
    console.log('Telegram Bot skipped - no valid token provided');
}

// FIXED: Kết nối MongoDB với fallback an toàn
let mongoose = require('mongoose');
require('mongoose-long')(mongoose);
mongoose.set('strictQuery', false);

const mongoURL = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (mongoURL && mongoURL !== 'mongodb://localhost:27017/taixiu') {
    mongoose.connect(mongoURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }).then(() => {
        console.log('Connected to MongoDB successfully');
    }).catch(err => {
        console.error('MongoDB connection error:', err.message);
    });
} else {
    console.log('MongoDB connection skipped - no database URL provided');
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

// Routes với try-catch
const loadModule = (path, name) => {
    try {
        require(path)(app, redT);
        console.log(`${name} loaded successfully`);
    } catch (e) {
        console.log(`${name} not found, skipping`);
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
    console.log('cron config loaded successfully');
} catch (e) {
    console.log('cron config not found, skipping');
}

if (TelegramBot) {
    try {
        require('./app/Telegram/Telegram')(redT);
        console.log('Telegram bot loaded successfully');
    } catch (e) {
        console.log('Telegram bot module not found, skipping');
    }
}

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// Routes cơ bản
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is running!',
        port: port,
        database: mongoURL ? 'Configured' : 'Not configured',
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

app.listen(port, function() {
    console.log("✅ Server is running on port", port);
    console.log("📊 Database:", mongoURL ? "Configured" : "Not configured - add MONGODB_URI");
    console.log("🤖 Telegram Bot:", TelegramBot ? "Connected" : "Not connected - add TELEGRAM_BOT_TOKEN");
});
