// 🎮 WebSocket Redirect for Tai Xiu Game
// Redirects all WebSocket connections to Render server
// Server: https://one11bet-websocket.onrender.com

console.log('🔧 Loading Tai Xiu WebSocket redirect...');

const originalWebSocket = window.WebSocket;
const RENDER_WEBSOCKET_URL = 'wss://one11bet-websocket.onrender.com';

// Override WebSocket constructor
window.WebSocket = function(url, protocols) {
    console.log('🎯 WebSocket connection attempt to:', url);
    
    // Redirect ALL WebSocket connections to our Render server
    if (url) {
        console.log('🔄 Redirecting WebSocket to:', RENDER_WEBSOCKET_URL);
        console.log('📡 Original URL was:', url);
        return new originalWebSocket(RENDER_WEBSOCKET_URL, protocols);
    }
    
    // Fallback for no URL
    return new originalWebSocket(url, protocols);
};

// Copy static properties to maintain Cocos compatibility
window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
window.WebSocket.OPEN = originalWebSocket.OPEN;
window.WebSocket.CLOSING = originalWebSocket.CLOSING;
window.WebSocket.CLOSED = originalWebSocket.CLOSED;

console.log('✅ WebSocket redirect loaded successfully!');
console.log('🎮 All WebSocket connections will go to:', RENDER_WEBSOCKET_URL);

// Additional fix for Socket.IO if game uses it
if (typeof window.io !== 'undefined') {
    console.log('🔧 Detected Socket.IO, applying redirect...');
    const originalIo = window.io;
    window.io = function(url, options) {
        console.log('🎯 Socket.IO connection attempt to:', url);
        
        if (url && (url.includes('127.0.0.1') || url.includes('localhost'))) {
            console.log('🔄 Redirecting Socket.IO to Render server');
            return originalIo(RENDER_WEBSOCKET_URL, options);
        }
        
        return originalIo(url, options);
    };
    console.log('✅ Socket.IO redirect applied');
}

// Game connection helper
window.gameWebSocketInfo = {
    server: RENDER_WEBSOCKET_URL,
    status: 'ready',
    version: '1.0.0',
    game: 'Tai Xiu'
};

console.log('🎲 Tai Xiu Game WebSocket setup complete!');
