require('dotenv').config();
var cors = require('cors');
let Telegram      = require('node-telegram-bot-api');
let TelegramToken = process.env.TELEGRAM_BOT_TOKEN || '1994240179:AAGmDQfq2EUrAtdVkdsABmp7tvgBNkqbrWs';
let TelegramBot   = new Telegram(TelegramToken, {polling: true});
let fs 			  = require('fs');
let express       = require('express');
let app           = express();
app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));
let port       = process.env.PORT || 2002;
let expressWs  = require('express-ws')(app);
let bodyParser = require('body-parser');
var morgan = require('morgan');

// FIXED: Config database
let configDB = {
    url: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/taixiu',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }
};

let mongoose = require('mongoose');
require('mongoose-long')(mongoose);
mongoose.set('strictQuery', false);

mongoose.connect(configDB.url, configDB.options).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// FIXED: Thay thế config admin
console.log('Skipping admin config - not found');

// đọc dữ liệu from
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(morgan('combined'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// server socket
let redT = expressWs.getWss();
process.redT = redT;
redT.telegram = TelegramBot;
global['redT'] = redT;
global.SKnapthe = 2;
global['userOnline'] = 0;

// FIXED: Thêm try-catch cho các require
try {
    require('./app/Helpers/socketUser')(redT);
} catch (e) {
    console.log('socketUser not found, skipping');
}

try {
    require('./routerHttp')(app, redT);
} catch (e) {
    console.log('routerHttp not found, skipping');
}

try {
    require('./routerCMS')(app, redT);
} catch (e) {
    console.log('routerCMS not found, skipping');
}

try {
    require('./routerSocket')(app, redT);
} catch (e) {
    console.log('routerSocket not found, skipping');
}

try {
    require('./app/Cron/taixiu')(redT);
} catch (e) {
    console.log('taixiu cron not found, skipping');
}

try {
    require('./app/Cron/baucua')(redT);
} catch (e) {
    console.log('baucua cron not found, skipping');
}

try {
    require('./config/cron')();
} catch (e) {
    console.log('cron config not found, skipping');
}

try {
    require('./app/Telegram/Telegram')(redT);
} catch (e) {
    console.log('Telegram bot not found, skipping');
}

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

app.listen(port, function() {
    console.log("Server listen on port ", port);
});

// Route mặc định để test
app.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Server is running!',
        port: port
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});
