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

// FIXED: Chỉ tạo thư mục public nếu chưa có, KHÔNG tạo file mặc định
const ensurePublicDir = () => {
    const publicDir = './public';
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('✅ Đã tạo thư mục public');
        // KHÔNG tạo file index.html mặc định - để dùng file từ GitHub
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

// Kiểm tra file game THẬT trong public
console.log('🎮 KIỂM TRA FILE GAME COCOS2D:');
try {
    if (fs.existsSync('./public')) {
        const publicFiles = fs.readdirSync('./public');
        
        // Kiểm tra có file game Cocos2d không
        const hasCocos2d = publicFiles.includes('cocos2d-js-min.js') || publicFiles.includes('cocos2d-js.js');
        const hasGameFiles = publicFiles.includes('main.js') && publicFiles.includes('index.html');
        
        if (hasCocos2d && hasGameFiles) {
            console.log('✅ ĐÃ TÌM THẤY GAME COCOS2D HOÀN CHỈNH!');
            console.log('📁 Cấu trúc game:');
            
            publicFiles.forEach(file => {
                const filePath = `./public/${file}`;
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    console.log(`   📁 ${file}/`);
                    // Hiển thị file trong folder con
                    try {
                        const subFiles = fs.readdirSync(filePath);
                        subFiles.forEach(subFile => {
                            console.log(`      📄 ${subFile}`);
                        });
                    } catch (e) {}
                } else {
                    const sizeKB = (stat.size / 1024).toFixed(2);
                    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
                    const size = stat.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
                    console.log(`   📄 ${file} (${size})`);
                }
            });
        } else {
            console.log('❌ KHÔNG tìm thấy file game Cocos2d');
            console.log('💡 Các file hiện có:', publicFiles);
            console.log('🚨 VUI LÒNG UPLOAD FILE GAME TỪ PCLOUD LÊN GITHUB!');
        }
    } else {
        console.log('❌ Thư mục public không tồn tại');
    }
} catch (e) {
    console.log('❌ Lỗi khi kiểm tra file game:', e.message);
}

// Routes
app.get('/', (req, res) => {
    console.log('🎯 Phục vụ game Cocos2d cho client');
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
    console.log('\n🎉 RVIP.FUN COCOS2D GAME SERVER ĐÃ KHỞI ĐỘNG');
    console.log('✅ Port:', port);
    console.log('🌐 URL: https://one11bet-com.onrender.com');
    console.log('📱 Game Cocos2d ready!');
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
