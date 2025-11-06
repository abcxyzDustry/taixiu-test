// WebSocket Redirect for Tai Xiu Game
// Redirects WebSocket connections to Render server

console.log('🎮 Loading Tai Xiu WebSocket redirect...');

const originalWebSocket = window.WebSocket;
const NEW_WEBSOCKET_URL = 'wss://one11bet-websocket.onrender.com';

// Override WebSocket constructor
window.WebSocket = function(url, protocols) {
    console.log('🔗 WebSocket connection attempt to:', url);
    
    // Redirect all WebSocket connections to our new server
    if (url) {
        console.log('🔄 Redirecting WebSocket to Render server:', NEW_WEBSOCKET_URL);
        return new originalWebSocket(NEW_WEBSOCKET_URL, protocols);
    }
    
    // Fallback for no URL
    return new originalWebSocket(url, protocols);
};

// Copy static properties to maintain compatibility
window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
window.WebSocket.OPEN = originalWebSocket.OPEN;
window.WebSocket.CLOSING = originalWebSocket.CLOSING;
window.WebSocket.CLOSED = originalWebSocket.CLOSED;

console.log('✅ WebSocket redirect loaded! Server:', NEW_WEBSOCKET_URL);

// Additional Socket.IO redirect (if game uses Socket.IO)
if (window.io) {
    const originalIo = window.io;
    window.io = function(url, options) {
        console.log('🔗 Socket.IO connection attempt to:', url);
        
        if (url && (url.includes('127.0.0.1') || url.includes('localhost'))) {
            console.log('🔄 Redirecting Socket.IO to:', NEW_WEBSOCKET_URL);
            return originalIo(NEW_WEBSOCKET_URL, options);
        }
        
        return originalIo(url, options);
    };
}
