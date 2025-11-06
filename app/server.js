require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// COCOS 2.x SPECIFIC FIX
console.log('🎯 COCOS 2.x DETECTED - Using legacy structure');

// Middleware
app.use(cors());
app.use(express.json());

// Đường dẫn public
const publicPath = path.join(__dirname, '..', 'public');

// ==================== FIX COCOS ASSETS PATH ====================
// Route fix cho assets Cocos - thêm /00/ vào đường dẫn
app.get('/res/raw-assets/:folder/:file', (req, res) => {
    const { folder, file } = req.params;
    const assetPath = path.join(publicPath, 'web', 'res', 'raw-assets', '00', folder, file);
    
    console.log(`🎯 Fixing asset path: ${folder}/${file} -> 00/${folder}/${file}`);
    
    if (fs.existsSync(assetPath)) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.sendFile(assetPath);
        console.log(`✅ Served: ${assetPath}`);
    } else {
        console.log(`❌ Asset not found: ${assetPath}`);
        
        // Fallback: thử đường dẫn không có /00/
        const fallbackPath = path.join(publicPath, 'web', 'res', 'raw-assets', folder, file);
        if (fs.existsSync(fallbackPath)) {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Cache-Control', 'public, max-age=31536000');
            res.sendFile(fallbackPath);
            console.log(`✅ Served fallback: ${fallbackPath}`);
        } else {
            res.status(404).send('Asset not found');
        }
    }
});

// Route fix cho web/res/raw-assets/
app.get('/web/res/raw-assets/:folder/:file', (req, res) => {
    const { folder, file } = req.params;
    const assetPath = path.join(publicPath, 'web', 'res', 'raw-assets', '00', folder, file);
    
    if (fs.existsSync(assetPath)) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.sendFile(assetPath);
    } else {
        // Fallback
        const fallbackPath = path.join(publicPath, 'web', 'res', 'raw-assets', folder, file);
        if (fs.existsSync(fallbackPath)) {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Cache-Control', 'public, max-age=31536000');
            res.sendFile(fallbackPath);
        } else {
            res.status(404).send('Asset not found');
        }
    }
});
// ==================== END FIX ====================

// Phục vụ static files với CORS và cache optimization cho Cocos 2.x
app.use(express.static(publicPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        // CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        
        // Cache headers cho assets Cocos 2.x
        if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|plist|ttf|fnt|mp3|wav|ogg)$/)) {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
        
        // Log các file quan trọng của Cocos 2.x
        if (filePath.match(/(main\.js|cocos2d-js|project\.json|settings\.json)$/)) {
            console.log(`🎮 Cocos 2.x Asset: ${path.basename(filePath)}`);
        }
    }
}));

// Route đặc biệt cho thư mục web Cocos 2.x
app.use('/web', express.static(path.join(publicPath, 'web'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// Route debug chi tiết cho Cocos 2.x
app.get('/debug', (req, res) => {
    let debugInfo = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔍 COCOS 2.x DEBUG INFO</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .section { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .success { color: green; border-left: 4px solid green; }
                .error { color: red; border-left: 4px solid red; }
                .warning { color: orange; border-left: 4px solid orange; }
                .info { color: blue; border-left: 4px solid blue; }
                pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
                .file-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
                .file-item { padding: 8px; background: #f0f0f0; border-radius: 4px; }
                .cocos-asset { background: #e8f5e8; }
                .essential { background: #fff3cd; }
            </style>
        </head>
        <body>
            <h1>🔍 COCOS 2.x GAME DEBUG INFO</h1>
            <div class="section info">
                <h2>🎯 COCOS 2.x DETECTED</h2>
                <p>Game được build với <strong>Cocos Creator 2.x</strong> - Structure khác với Cocos 3.x</p>
            </div>
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
            
            // Web folder detailed analysis - COCOS 2.x SPECIFIC
            const webPath = path.join(publicPath, 'web');
            if (fs.existsSync(webPath)) {
                debugInfo += `<div class="section">
                    <h2>🎮 Web Game Folder (Cocos 2.x)</h2>
                    <p><strong>Path:</strong> ${webPath}</p>`;
                
                const webFiles = fs.readdirSync(webPath);
                debugInfo += `<div class="file-list">`;
                
                webFiles.forEach(file => {
                    const filePath = path.join(webPath, file);
                    const stat = fs.statSync(filePath);
                    const isCocosAsset = file.match(/(\.js|\.json|\.html|cocos2d)/);
                    const isEssential = file.match(/(index\.html|main\.js|cocos2d)/);
                    
                    debugInfo += `<div class="file-item ${isCocosAsset ? 'cocos-asset' : ''} ${isEssential ? 'essential' : ''}">
                        <strong>${stat.isDirectory() ? '📁' : '📄'} ${file}</strong>
                        <br><small>${stat.size} bytes</small>
                        ${file === 'index.html' ? '<br><span style="color: green;">✅ Main Game File</span>' : ''}
                        ${file === 'main.js' ? '<br><span style="color: blue;">🎯 Cocos Entry Point</span>' : ''}
                        ${file === 'cocos2d-js-min.js' ? '<br><span style="color: purple;">🚀 Cocos Engine</span>' : ''}
                    </div>`;
                });
                
                debugInfo += `</div>`;
                
                // Check essential Cocos 2.x files
                const essentialFiles = [
                    'index.html',
                    'main.js',
                    'cocos2d-js-min.js',
                    'src',
                    'res'
                ];
                
                debugInfo += `<h3>🔍 Essential Cocos 2.x Files Check:</h3><ul>`;
                essentialFiles.forEach(essentialFile => {
                    const essentialPath = path.join(webPath, essentialFile);
                    if (fs.existsSync(essentialPath)) {
                        debugInfo += `<li style="color: green;">✅ ${essentialFile}</li>`;
                    } else {
                        debugInfo += `<li style="color: red;">❌ ${essentialFile}</li>`;
                    }
                });
                debugInfo += `</ul>`;
                
                // Cocos 2.x specific notes
                debugInfo += `<div class="section info">
                    <h3>📝 Cocos 2.x Notes:</h3>
                    <ul>
                        <li><strong>project.json</strong> - Không có trong Cocos 2.x (NORMAL)</li>
                        <li><strong>settings.json</strong> - Không có trong Cocos 2.x (NORMAL)</li>
                        <li><strong>main.js</strong> - File entry point chính</li>
                        <li><strong>cocos2d-js-min.js</strong> - Engine core</li>
                        <li><strong>src/</strong> - Source code game</li>
                        <li><strong>res/</strong> - Resources, assets</li>
                    </ul>
                </div>`;
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
                <p><a href="/" target="_blank">🏠 Main Game Page</a></p>
                <p><a href="/admin" target="_blank">🔧 Admin Panel</a></p>
                <p><a href="/web" target="_blank">🎮 Direct Web Folder</a></p>
                <p><a href="/web/index.html" target="_blank">🔗 Direct Game Link</a></p>
            </div>
        </body>
        </html>
    `;
    
    res.send(debugInfo);
});

// Route debug assets
app.get('/debug-assets', (req, res) => {
    const testAssets = [
        'f5/f5ba02e3-3543-45e9-b1eb-6649bf3ad413.png',
        '42/42fa96cc-d624-4aaa-8246-95de1906f1f6.png',
        '73/735cb688-d4a0-405a-9fea-33e79e15c9bb.png'
    ];
    
    let debugInfo = '<h1>🔍 ASSETS DEBUG</h1>';
    
    testAssets.forEach(asset => {
        const [folder, file] = asset.split('/');
        
        debugInfo += `<h3>Testing: ${asset}</h3>`;
        
        const pathWith00 = path.join(publicPath, 'web', 'res', 'raw-assets', '00', folder, file);
        const pathDirect = path.join(publicPath, 'web', 'res', 'raw-assets', folder, file);
        
        debugInfo += `<p>With 00/: ${pathWith00} - ${fs.existsSync(pathWith00) ? '✅ EXISTS' : '❌ MISSING'}</p>`;
        debugInfo += `<p>Direct: ${pathDirect} - ${fs.existsSync(pathDirect) ? '✅ EXISTS' : '❌ MISSING'}</p>`;
    });
    
    res.send(debugInfo);
});

// Route chính - Main Game Cocos 2.x
app.get('/', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    console.log('🎮 Serving COCOS 2.x GAME from:', webIndexPath);
    
    if (fs.existsSync(webIndexPath)) {
        console.log('✅ Cocos 2.x game file exists, sending...');
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

// Route trực tiếp đến game file
app.get('/web/index.html', (req, res) => {
    const webIndexPath = path.join(publicPath, 'web', 'index.html');
    res.sendFile(webIndexPath);
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
    console.log('🚀 COCOS 2.x GAME SERVER STARTED');
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
    console.log(`   Direct: http://localhost:${port}/web/index.html`);
    console.log('================================');
    
    // Verify essential Cocos 2.x files
    try {
        const essentialFiles = [
            { path: path.join(publicPath, 'web', 'index.html'), name: 'index.html' },
            { path: path.join(publicPath, 'web', 'main.js'), name: 'main.js' },
            { path: path.join(publicPath, 'web', 'cocos2d-js-min.js'), name: 'cocos2d-js-min.js' },
            { path: path.join(publicPath, 'admin', 'index.html'), name: 'admin/index.html' }
        ];
        
        essentialFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
                console.log(`✅ ${file.name} - READY`);
            } else {
                console.log(`❌ ${file.name} - MISSING`);
            }
        });
        
        console.log('⚠️ project.json - NOT NEEDED (Cocos 2.x)');
        console.log('⚠️ settings.json - NOT NEEDED (Cocos 2.x)');
        
    } catch (e) {
        console.log('⚠️ File check error:', e.message);
    }
});
