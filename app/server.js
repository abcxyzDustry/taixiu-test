require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// QUAN TRỌNG: Serve static files từ thư mục public
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// Kiểm tra file game Cocos2d
const fs = require('fs');
console.log('🎮 Checking game files in public directory:');

const publicFiles = fs.readdirSync('./public', { withFileTypes: true });
publicFiles.forEach(file => {
    if (file.isDirectory()) {
        console.log(`📁 public/${file.name}/`);
    } else {
        console.log(`📄 public/${file.name}`);
    }
});

// Routes - luôn trả về game HTML
app.get('/', (req, res) => {
    console.log('🎯 Serving game index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API backend routes (nếu cần)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        game: 'RVIP.FUN - Cocos2d Game',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/games', (req, res) => {
    res.json({
        games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá'],
        status: 'active'
    });
});

// Fallback - luôn trả về game
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🎮 RVIP.FUN Game Server running on port ${port}`);
    console.log(`🌐 Game URL: https://one11bet-com.onrender.com`);
    console.log(`📱 Mobile game ready`);
    console.log(`🎯 Serving Cocos2d HTML5 game`);
});
