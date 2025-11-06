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

// Serve static files với debug
app.use(express.static('public', {
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
        
        // Public folder
        const publicPath = './public';
        if (fs.existsSync(publicPath)) {
            debugInfo += `<h2>✅ Public Folder EXISTS</h2>`;
            const publicFiles = fs.readdirSync(publicPath);
            debugInfo += `<pre>${JSON.stringify(publicFiles, null, 2)}</pre>`;
            
            // Check each file
            publicFiles.forEach(file => {
                const filePath = path.join(publicPath, file);
                const stat = fs.statSync(filePath);
                debugInfo += `<p>${stat.isDirectory() ? '📁' : '📄'} ${file} - ${stat.size} bytes</p>`;
            });
        } else {
            debugInfo += `<h2>❌ Public Folder NOT FOUND</h2>`;
        }
        
    } catch (e) {
        debugInfo += `<h2>❌ ERROR: ${e.message}</h2>`;
    }
    
    res.send(debugInfo);
});

// Routes
app.get('/', (req, res) => {
    console.log('🎯 Serving game from:', path.join(__dirname, 'public', 'index.html'));
    
    const gamePath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(gamePath)) {
        console.log('✅ Game file exists, sending...');
        res.sendFile(gamePath);
    } else {
        console.log('❌ Game file NOT found at:', gamePath);
        res.send(`
            <h1>🎮 RVIP.FUN - File Debug</h1>
            <p>Game file not found at: ${gamePath}</p>
            <a href="/debug">View Debug Info</a>
        `);
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Debug Server running on port ${port}`);
});
