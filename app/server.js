require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// Chạy debug trước
require('./render-build-debug');

// Middleware
app.use(cors());
app.use(express.json());

// QUAN TRỌNG: Sửa đường dẫn public - dùng '../public' thay vì 'public'
const publicPath = path.join(__dirname, '..', 'public');

// Serve static files với debug
app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
        console.log(`📤 Serving static file: ${filePath}`);
    }
}));

// Route debug
app.get('/debug', (req, res) => {
    let debugInfo = '<h1>🔍 RENDER DEBUG INFO</h1>';
    
    try {
        // Current directory
        debugInfo += `<h2>Current Directory: ${__dirname}</h2>`;
        debugInfo += `<pre>${JSON.stringify(fs.readdirSync(__dirname), null, 2)}</pre>`;
        
        // Public folder - SỬA ĐƯỜNG DẪN
        if (fs.existsSync(publicPath)) {
            debugInfo += `<h2>✅ Public Folder EXISTS at: ${publicPath}</h2>`;
            const publicFiles = fs.readdirSync(publicPath);
            debugInfo += `<pre>${JSON.stringify(publicFiles, null, 2)}</pre>`;
            
            // Check each file
            publicFiles.forEach(file => {
                const filePath = path.join(publicPath, file);
                const stat = fs.statSync(filePath);
                debugInfo += `<p>${stat.isDirectory() ? '📁' : '📄'} ${file} - ${stat.size} bytes</p>`;
                
                // Kiểm tra xem có index.html trong thư mục con không
                if (stat.isDirectory()) {
                    const indexPath = path.join(filePath, 'index.html');
                    if (fs.existsSync(indexPath)) {
                        debugInfo += `<p style="color: green;">✅ Found index.html in ${file}/</p>`;
                    } else {
                        debugInfo += `<p style="color: orange;">⚠️ No index.html in ${file}/</p>`;
                    }
                }
            });
        } else {
            debugInfo += `<h2>❌ Public Folder NOT FOUND at: ${publicPath}</h2>`;
        }
        
    } catch (e) {
        debugInfo += `<h2>❌ ERROR: ${e.message}</h2>`;
    }
    
    res.send(debugInfo);
});

// Routes chính - SỬA ĐƯỜNG DẪN
app.get('/', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    console.log('🎯 Serving web from:', webIndexPath);
    
    if (fs.existsSync(webIndexPath)) {
        console.log('✅ Web file exists, sending...');
        res.sendFile(webIndexPath);
    } else {
        console.log('❌ Web file NOT found at:', webIndexPath);
        res.send(`
            <h1>🎮 DEBUG - File Not Found</h1>
            <p>Web file not found at: ${webIndexPath}</p>
            <p>Public path: ${publicPath}</p>
            <a href="/debug">View Detailed Debug Info</a>
        `);
    }
});

// Route cho admin - THÊM MỚI
app.get('/admin', (req, res) => {
    const adminIndexPath = path.join(publicPath, 'admin', 'index.html');
    console.log('🎯 Serving admin from:', adminIndexPath);
    
    if (fs.existsSync(adminIndexPath)) {
        console.log('✅ Admin file exists, sending...');
        res.sendFile(adminIndexPath);
    } else {
        console.log('❌ Admin file NOT found at:', adminIndexPath);
        res.redirect('/debug');
    }
});

// Route cho web explicit - THÊM MỚI
app.get('/web', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    console.log('🎯 Serving web from:', webIndexPath);
    
    if (fs.existsSync(webIndexPath)) {
        res.sendFile(webIndexPath);
    } else {
        res.redirect('/debug');
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Debug Server running on port ${port}`);
    console.log(`📁 Public path: ${publicPath}`);
    console.log(`🎯 Web: ${path.join(publicPath, 'web', 'index.html')}`);
    console.log(`🎯 Admin: ${path.join(publicPath, 'admin', 'index.html')}`);
});
