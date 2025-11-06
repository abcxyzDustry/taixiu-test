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

// Đường dẫn public
const publicPath = path.join(__dirname, '..', 'public');

// Phục vụ static files với CORS và cache optimization
app.use(express.static(publicPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        // CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        
        // Cache headers cho assets
        if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|wasm|bin|mp3|wav|ogg|ttf|woff|woff2)$/)) {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
        
        // Log các file quan trọng
        if (filePath.match(/\.(wasm|bin|json|js)$/)) {
            console.log(`📦 Loading asset: ${path.basename(filePath)}`);
        }
    }
}));

// Route đặc biệt cho thư mục web
app.use('/web', express.static(path.join(publicPath, 'web'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// Route debug chi tiết
app.get('/debug', (req, res) => {
    let debugInfo = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔍 RENDER DEBUG INFO</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .section { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .success { color: green; border-left: 4px solid green; }
                .error { color: red; border-left: 4px solid red; }
                .warning { color: orange; border-left: 4px solid orange; }
                pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
                .file-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
                .file-item { padding: 8px; background: #f0f0f0; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>🔍 COCOS GAME DEBUG INFO</h1>
    `;
    
    try {
        // Current directory info
        debugInfo += `<div class="section">
            <h2>📁 Current Directory</h2>
            <p><strong>Path:</strong> ${__dirname}</p>
            <pre>${JSON.stringify(fs.readdirSync(__dirname), null, 2)}</pre>
        </div>`;
        
        // Public folder analysis
        if (fs.existsSync(publicPath)) {
            debugInfo += `<div class="section success">
                <h2>✅ Public Folder</h2>
                <p><strong>Path:</strong> ${publicPath}</p>`;
            
            const publicFiles = fs.readdirSync(publicPath);
            debugInfo += `<div class="file-list">`;
            
            publicFiles.forEach(file => {
                const filePath = path.join(publicPath, file);
                const stat = fs.statSync(filePath);
                const isDir = stat.isDirectory();
                
                debugInfo += `<div class="file-item">
                    <strong>${isDir ? '📁' : '📄'} ${file}</strong>
                    <br><small>${stat.size} bytes</small>
                    ${isDir ? '<br><em>Directory</em>' : ''}
                </div>`;
            });
            
            debugInfo += `</div>`;
            
            // Web folder detailed analysis
            const webPath = path.join(publicPath, 'web');
            if (fs.existsSync(webPath)) {
                debugInfo += `<div class="section">
                    <h2>🎮 Web Game Folder</h2>
                    <p><strong>Path:</strong> ${webPath}</p>`;
                
                const webFiles = fs.readdirSync(webPath);
                debugInfo += `<div class="file-list">`;
                
                webFiles.forEach(file => {
                    const filePath = path.join(webPath, file);
                    const stat = fs.statSync(filePath);
                    
                    debugInfo += `<div class="file-item">
                        <strong>${stat.isDirectory() ? '📁' : '📄'} ${file}</strong>
                        <br><small>${stat.size} bytes</small>
                        ${file === 'index.html' ? '<br><span style="color: green;">✅ Main Game File</span>' : ''}
                        ${file.match(/\.(json|js|wasm|bin)$/) ? '<br><span style="color: blue;">🔧 Game Asset</span>' : ''}
                    </div>`;
                });
                
                debugInfo += `</div>`;
                
                // Check essential Cocos files
                const essentialFiles = [
                    'index.html',
                    'project.json',
                    'settings.json',
                    'main.js',
                    'src'
                ];
                
                debugInfo += `<h3>🔍 Essential Cocos Files Check:</h3><ul>`;
                essentialFiles.forEach(essentialFile => {
                    const essentialPath = path.join(webPath, essentialFile);
                    if (fs.existsSync(essentialPath)) {
                        debugInfo += `<li style="color: green;">✅ ${essentialFile}</li>`;
                    } else {
                        debugInfo += `<li style="color: red;">❌ ${essentialFile}</li>`;
                    }
                });
                debugInfo += `</ul>`;
            }
            debugInfo += `</div>`;
        } else {
            debugInfo += `<div class="section error">
                <h2>❌ Public Folder NOT FOUND</h2>
                <p>Path: ${publicPath}</p>
            </div>`;
        }
        
    } catch (e) {
        debugInfo += `<div class="section error">
            <h2>❌ ERROR</h2>
            <p>${e.message}</p>
        </div>`;
    }
    
    debugInfo += `
            <div class="section">
                <h2>🚀 Quick Links</h2>
                <p><a href="/" target="_blank">🏠 Main Page</a></p>
                <p><a href="/admin" target="_blank">🔧 Admin Panel</a></p>
                <p><a href="/web" target="_blank">🎮 Direct Web Folder</a></p>
            </div>
        </body>
        </html>
    `;
    
    res.send(debugInfo);
});

// Route chính - Main Game
app.get('/', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    console.log('🎮 Serving COCOS GAME from:', webIndexPath);
    
    if (fs.existsSync(webIndexPath)) {
        console.log('✅ Game file exists, sending Cocos game...');
        res.sendFile(webIndexPath);
    } else {
        console.log('❌ Game file NOT found, showing debug...');
        res.redirect('/debug');
    }
});

// Route cho admin
app.get('/admin', (req, res) => {
    const adminIndexPath = path.join(publicPath, 'admin', 'index.html');
    console.log('🔧 Serving admin from:', adminIndexPath);
    
    if (fs.existsSync(adminIndexPath)) {
        res.sendFile(adminIndexPath);
    } else {
        res.redirect('/debug');
    }
});

// Route cho web direct
app.get('/web', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    res.sendFile(webIndexPath);
});

// Cocos asset routes - quan trọng cho WASM và assets
app.get('/project.json', (req, res) => {
    const projectPath = path.join(publicPath, 'web', 'project.json');
    if (fs.existsSync(projectPath)) {
        res.set('Access-Control-Allow-Origin', '*');
        res.sendFile(projectPath);
    } else {
        res.status(404).send('project.json not found');
    }
});

app.get('/settings.json', (req, res) => {
    const settingsPath = path.join(publicPath, 'web', 'settings.json');
    if (fs.existsSync(settingsPath)) {
        res.set('Access-Control-Allow-Origin', '*');
        res.sendFile(settingsPath);
    } else {
        res.status(404).send('settings.json not found');
    }
});

// Fallback route cho Single Page Application
app.get('*', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    if (fs.existsSync(webIndexPath)) {
        res.sendFile(webIndexPath);
    } else {
        res.redirect('/debug');
    }
});

// Khởi động server
app.listen(port, '0.0.0.0', () => {
    console.log('🚀 COCOS GAME SERVER STARTED');
    console.log('================================');
    console.log(`📡 Port: ${port}`);
    console.log(`📁 Public path: ${publicPath}`);
    console.log(`🎮 Game: ${path.join(publicPath, 'web', 'index.html')}`);
    console.log(`🔧 Admin: ${path.join(publicPath, 'admin', 'index.html')}`);
    console.log('================================');
    console.log('🌐 URLs:');
    console.log(`   Main: http://localhost:${port}/`);
    console.log(`   Admin: http://localhost:${port}/admin`);
    console.log(`   Debug: http://localhost:${port}/debug`);
    console.log('================================');
    
    // Verify essential files
    try {
        const essentialFiles = [
            path.join(publicPath, 'web', 'index.html'),
            path.join(publicPath, 'web', 'project.json'),
            path.join(publicPath, 'admin', 'index.html')
        ];
        
        essentialFiles.forEach(file => {
            if (fs.existsSync(file)) {
                console.log(`✅ ${path.basename(file)} - READY`);
            } else {
                console.log(`❌ ${path.basename(file)} - MISSING`);
            }
        });
    } catch (e) {
        console.log('⚠️ File check error:', e.message);
    }
});
