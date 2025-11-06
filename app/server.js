require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// FIX: Kiểm tra và tạo thư mục public nếu chưa có
const ensurePublicDir = () => {
    const publicDir = './public';
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('✅ Đã tạo thư mục public');
        
        // Tạo file index.html mặc định nếu chưa có
        const defaultHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Game Server</title>
    <style>
        body { 
            font-family: Arial; 
            background: #1a1a1a; 
            color: white; 
            text-align: center; 
            padding: 50px; 
        }
        .container { 
            background: #2a2a2a; 
            padding: 40px; 
            border-radius: 10px; 
            display: inline-block; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Game Server</h1>
        <p>Server đang hoạt động!</p>
        <p>Thêm file game vào thư mục public</p>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(path.join(publicDir, 'index.html'), defaultHtml);
        console.log('✅ Đã tạo file index.html mặc định');
    }
};

// Gọi hàm đảm bảo thư mục tồn tại
ensurePublicDir();

// Serve static files từ public
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// Kiểm tra file trong public (với xử lý lỗi)
console.log('🎮 Kiểm tra file game:');
try {
    const publicFiles = fs.readdirSync('./public');
    if (publicFiles.length === 0) {
        console.log('📁 Thư mục public trống');
    } else {
        publicFiles.forEach(file => {
            const filePath = `./public/${file}`;
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                console.log(`📁 ${file}/`);
            } else {
                const size = (stat.size / 1024).toFixed(2);
                console.log(`📄 ${file} (${size} KB)`);
            }
        });
    }
} catch (e) {
    console.log('❌ Lỗi khi đọc thư mục public:', e.message);
}

// Routes
app.get('/', (req, res) => {
    console.log('🎯 Phục vụ game cho:', req.headers['user-agent']);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API backend (giữ lại cho game)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'RVIP.FUN Game Server',
        timestamp: new Date().toISOString(),
        games: ['Tài Xỉu', 'Bầu Cua', 'Mini Poker', 'Bắn Cá']
    });
});

// Fallback - luôn trả về game
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log('\n🎉 RVIP.FUN GAME SERVER ĐÃ KHỞI ĐỘNG');
    console.log('✅ Port:', port);
    console.log('🌐 URL: https://one11bet-com.onrender.com');
    console.log('📱 Game ready trên mọi thiết bị');
    console.log('🎮 Phục vụ file từ thư mục public/');
});
