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

// Serve static files từ cả public/web/ và public/admin/
app.use('/web', express.static('public/web'));
app.use('/admin', express.static('public/admin'));

// Kiểm tra cả 2 version game
console.log('🎮 KIỂM TRA CÁC VERSION GAME:');

// Kiểm tra web version
console.log('\n📱 WEB VERSION (public/web/):');
if (fs.existsSync('./public/web')) {
    const webFiles = fs.readdirSync('./public/web');
    const hasWebGame = webFiles.includes('cocos2d-js-min.js') && webFiles.includes('index.html');
    console.log(hasWebGame ? '✅ CÓ' : '❌ KHÔNG', 'file game web');
    console.log('   Files:', webFiles);
} else {
    console.log('❌ Thư mục web không tồn tại');
}

// Kiểm tra admin version
console.log('\n⚙️ ADMIN VERSION (public/admin/):');
if (fs.existsSync('./public/admin')) {
    const adminFiles = fs.readdirSync('./public/admin');
    const hasAdminGame = adminFiles.includes('cocos2d-js-min.js') && adminFiles.includes('index.html');
    console.log(hasAdminGame ? '✅ CÓ' : '❌ KHÔNG', 'file game admin');
    console.log('   Files:', adminFiles);
} else {
    console.log('❌ Thư mục admin không tồn tại');
}

// ROUTES - Chọn version mặc định

// Mặc định: dùng WEB version cho người dùng
app.get('/', (req, res) => {
    console.log('🎯 Phục vụ WEB version cho người dùng');
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

// Web version
app.get('/web', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

app.get('/web/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

// Admin version
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'RVIP.FUN Multi-version Game Server',
        versions: {
            web: fs.existsSync('./public/web/index.html'),
            admin: fs.existsSync('./public/admin/index.html')
        },
        timestamp: new Date().toISOString()
    });
});

// Fallback - luôn trả về web version
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'web', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log('\n🎉 RVIP.FUN MULTI-VERSION GAME SERVER ĐÃ KHỞI ĐỘNG');
    console.log('✅ Port:', port);
    console.log('🌐 URLs:');
    console.log('   📱 Người dùng: https://one11bet-com.onrender.com');
    console.log('   📱 Web version: https://one11bet-com.onrender.com/web');
    console.log('   ⚙️ Admin version: https://one11bet-com.onrender.com/admin');
});

// Xử lý lỗi
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
