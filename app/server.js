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

// Serve static files từ public/ (VỊ TRÍ THẬT)
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// Kiểm tra file game THẬT
console.log('🎮 KIỂM TRA FILE GAME TRÊN SERVER:');
try {
    if (fs.existsSync('./public')) {
        const publicFiles = fs.readdirSync('./public');
        console.log('📁 Toàn bộ file trong public/:', publicFiles);
        
        // Kiểm tra từng file quan trọng
        const importantFiles = [
            'index.html', 'main.js', 'cocos2d-js-min.js',
            'web/', 'admin/'
        ];
        
        importantFiles.forEach(file => {
            const filePath = `./public/${file}`;
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    console.log(`✅ 📁 ${file}/ - TỒN TẠI`);
                    // Hiển thị file trong thư mục con
                    try {
                        const subFiles = fs.readdirSync(filePath);
                        console.log(`   📄 ${subFiles.join(', ')}`);
                    } catch (e) {}
                } else {
                    const size = (stat.size / 1024 / 1024).toFixed(2);
                    console.log(`✅ 📄 ${file} - ${size} MB`);
                }
            } else {
                console.log(`❌ ${file} - KHÔNG TỒN TẠI`);
            }
        });
        
    } else {
        console.log('❌ Thư mục public không tồn tại');
    }
} catch (e) {
    console.log('❌ Lỗi khi kiểm tra file:', e.message);
}

// ROUTES - Sửa đường dẫn đúng

// Route chính - dùng file trong public/ (không phải public/web/)
app.get('/', (req, res) => {
    console.log('🎯 Phục vụ game từ public/');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Web version routes
app.get('/web', (req, res) => {
    console.log('📱 Phục vụ web version');
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

app.get('/web/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

// Admin version routes
app.get('/admin', (req, res) => {
    console.log('⚙️ Phục vụ admin version');
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// API health check
app.get('/api/health', (req, res) => {
    const gameStatus = {
        main: fs.existsSync('./public/index.html'),
        web: fs.existsSync('./public/web/index.html'),
        admin: fs.existsSync('./public/admin/index.html')
    };
    
    res.json({ 
        status: 'healthy', 
        message: 'RVIP.FUN Game Server - Files Found!',
        game_files: gameStatus,
        timestamp: new Date().toISOString()
    });
});

// Fallback - luôn trả về main game
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log('\n🎉 RVIP.FUN GAME SERVER ĐÃ KHỞI ĐỘNG');
    console.log('✅ Port:', port);
    console.log('🌐 URLs:');
    console.log('   🎮 Main Game: https://one11bet-com.onrender.com');
    console.log('   📱 Web Version: https://one11bet-com.onrender.com/web');
    console.log('   ⚙️ Admin Version: https://one11bet-com.onrender.com/admin');
    console.log('🎯 File game đã được tìm thấy trên GitHub!');
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
