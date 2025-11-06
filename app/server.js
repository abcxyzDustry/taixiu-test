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

// QUAN TRỌNG: Sửa đường dẫn public
const publicPath = path.join(__dirname, '..', 'public');

// Serve static files
app.use(express.static(publicPath));

// Route chính - SỬA LẠI
app.get('/', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    console.log('🎯 Serving MAIN PAGE from:', webIndexPath);
    
    if (fs.existsSync(webIndexPath)) {
        console.log('✅ Web index.html exists, sending...');
        res.sendFile(webIndexPath);
    } else {
        console.log('❌ Web index.html NOT found, checking alternatives...');
        
        // Thử các đường dẫn khác
        const alternativePaths = [
            path.join(publicPath, 'index.html'),
            path.join(publicPath, 'web', 'game.html'),
            path.join(publicPath, 'web', 'main.html')
        ];
        
        for (let altPath of alternativePaths) {
            if (fs.existsSync(altPath)) {
                console.log(`✅ Found alternative: ${altPath}`);
                return res.sendFile(altPath);
            }
        }
        
        // Nếu không tìm thấy file nào
        res.send(`
            <h1>🎮 Game Server</h1>
            <p>Server đang hoạt động!</p>
            <p>Thêm file game vào thư mục public</p>
            <hr>
            <p><strong>Debug Info:</strong></p>
            <p>Public Path: ${publicPath}</p>
            <p>Web Path: ${webIndexPath}</p>
            <p>Files in public: ${fs.existsSync(publicPath) ? fs.readdirSync(publicPath).join(', ') : 'NOT FOUND'}</p>
            <a href="/admin">Go to Admin</a> | 
            <a href="/debug">Debug Info</a>
        `);
    }
});

// Route cho admin
app.get('/admin', (req, res) => {
    const adminIndexPath = path.join(publicPath, 'admin', 'index.html');
    console.log('🎯 Serving admin from:', adminIndexPath);
    
    if (fs.existsSync(adminIndexPath)) {
        res.sendFile(adminIndexPath);
    } else {
        res.redirect('/debug');
    }
});

// Route debug (giữ nguyên)
app.get('/debug', (req, res) => {
    let debugInfo = '<h1>🔍 RENDER DEBUG INFO</h1>';
    
    try {
        debugInfo += `<h2>Current Directory: ${__dirname}</h2>`;
        debugInfo += `<pre>${JSON.stringify(fs.readdirSync(__dirname), null, 2)}</pre>`;
        
        if (fs.existsSync(publicPath)) {
            debugInfo += `<h2>✅ Public Folder EXISTS at: ${publicPath}</h2>`;
            const publicFiles = fs.readdirSync(publicPath);
            debugInfo += `<pre>${JSON.stringify(publicFiles, null, 2)}</pre>`;
            
            publicFiles.forEach(file => {
                const filePath = path.join(publicPath, file);
                const stat = fs.statSync(filePath);
                debugInfo += `<p>${stat.isDirectory() ? '📁' : '📄'} ${file}</p>`;
                
                if (stat.isDirectory()) {
                    const subFiles = fs.readdirSync(filePath);
                    debugInfo += `<p>📄 Files: ${subFiles.join(', ')}</p>`;
                    
                    const indexPath = path.join(filePath, 'index.html');
                    if (fs.existsSync(indexPath)) {
                        debugInfo += `<p style="color: green;">✅ Found index.html</p>`;
                    }
                }
            });
        }
        
    } catch (e) {
        debugInfo += `<h2>❌ ERROR: ${e.message}</h2>`;
    }
    
    res.send(debugInfo);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📁 Public path: ${publicPath}`);
    console.log(`🎯 Main Page: ${path.join(publicPath, 'web', 'index.html')}`);
    console.log(`🎯 Admin: ${path.join(publicPath, 'admin', 'index.html')}`);
});
