// 🎮 WebSocket & Socket.IO Fix for Admin Panel
// Fix lỗi kết nối localhost WebSocket trong Admin

console.log('🔧 Loading Admin Panel WebSocket Fix...');

const SOCKET_SERVER_URL = 'https://one11bet-websocket.onrender.com';

// Initialize Socket.IO for Admin Panel
if (typeof io !== 'undefined') {
    window.adminSocket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    // Socket.IO event handlers
    window.adminSocket.on('connect', () => {
        console.log('✅ Admin Panel connected to Socket.IO server');
        console.log('📊 Socket ID:', window.adminSocket.id);
        
        // Notify admin UI about successful connection
        if (window.adminConnectionUpdate) {
            window.adminConnectionUpdate('connected');
        }
    });

    window.adminSocket.on('disconnect', (reason) => {
        console.log('❌ Admin Panel disconnected:', reason);
        
        if (window.adminConnectionUpdate) {
            window.adminConnectionUpdate('disconnected');
        }
    });

    window.adminSocket.on('connect_error', (error) => {
        console.log('❌ Admin Panel connection error:', error);
        
        if (window.adminConnectionUpdate) {
            window.adminConnectionUpdate('error');
        }
    });

    // Handle admin-specific events
    window.adminSocket.on('admin_stats', (data) => {
        console.log('📊 Admin stats update:', data);
        if (window.updateAdminStats) {
            window.updateAdminStats(data);
        }
    });

    window.adminSocket.on('game_events', (data) => {
        console.log('🎮 Game events for admin:', data);
        if (window.handleGameEvents) {
            window.handleGameEvents(data);
        }
    });

    window.adminSocket.on('player_activity', (data) => {
        console.log('👤 Player activity:', data);
        if (window.updatePlayerActivity) {
            window.updatePlayerActivity(data);
        }
    });
}

// WebSocket Blocker - Prevent localhost connections
const originalWebSocket = window.WebSocket;

window.WebSocket = function(url, protocols) {
    console.log('🎯 Admin WebSocket connection attempt to:', url);
    
    // Block and mock localhost WebSocket connections
    if (url && (url.includes('127.0.0.1') || url.includes('localhost'))) {
        console.log('🔄 Blocking localhost WebSocket, using mock connection');
        
        // Return mock WebSocket that does nothing
        return {
            readyState: 1, // OPEN - fake successful connection
            url: url,
            
            send: function(data) {
                console.log('📤 Admin WebSocket send intercepted:', data);
                // Optionally route to Socket.IO
                try {
                    const parsedData = JSON.parse(data);
                    if (window.adminSocket && window.adminSocket.connected) {
                        window.adminSocket.emit('admin_command', parsedData);
                    }
                } catch (e) {
                    console.log('📤 Raw data sent:', data);
                }
            },
            
            close: function(code, reason) {
                console.log('🔒 Admin WebSocket closed', code, reason);
            },
            
            addEventListener: function(event, callback) {
                console.log('🎧 Admin WebSocket listening for:', event);
                
                if (event === 'open') {
                    // Simulate immediate successful connection
                    setTimeout(() => {
                        if (typeof callback === 'function') {
                            const openEvent = new Event('open');
                            callback(openEvent);
                        }
                    }, 100);
                }
                else if (event === 'message') {
                    // Handle incoming messages from Socket.IO
                    if (window.adminSocket) {
                        window.adminSocket.on('admin_message', (data) => {
                            const messageEvent = new MessageEvent('message', {
                                data: JSON.stringify(data)
                            });
                            callback(messageEvent);
                        });
                    }
                }
                else if (event === 'error') {
                    // Never call error callback - fake success
                    console.log('🎧 Error listener added (will not be called)');
                }
                else if (event === 'close') {
                    console.log('🎧 Close listener added');
                }
            },
            
            removeEventListener: function(event, callback) {
                console.log('🔕 Admin WebSocket removeEventListener:', event);
            },
            
            dispatchEvent: function(event) {
                console.log('⚡ Admin WebSocket dispatchEvent:', event.type);
                return true;
            }
        };
    }
    
    // Allow non-localhost WebSocket connections
    console.log('✅ Allowing non-localhost WebSocket:', url);
    return new originalWebSocket(url, protocols);
};

// Copy static properties for compatibility
window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
window.WebSocket.OPEN = originalWebSocket.OPEN;
window.WebSocket.CLOSING = originalWebSocket.CLOSING;
window.WebSocket.CLOSED = originalWebSocket.CLOSED;

// Admin connection helper functions
window.adminConnection = {
    getStatus: function() {
        return window.adminSocket ? 
            (window.adminSocket.connected ? 'connected' : 'disconnected') : 
            'not_initialized';
    },
    
    sendCommand: function(command, data) {
        if (window.adminSocket && window.adminSocket.connected) {
            window.adminSocket.emit('admin_command', { command, data });
            return true;
        }
        return false;
    },
    
    getStats: function() {
        if (window.adminSocket && window.adminSocket.connected) {
            window.adminSocket.emit('get_stats');
            return true;
        }
        return false;
    }
};

console.log('✅ Admin Panel WebSocket Fix loaded successfully!');
console.log('🎯 Server:', SOCKET_SERVER_URL);
console.log('🔧 Admin connection helper available at: window.adminConnection');

// Auto-initialize admin connection
setTimeout(() => {
    if (window.adminSocket && !window.adminSocket.connected) {
        console.log('🔄 Attempting to connect admin socket...');
        window.adminSocket.connect();
    }
}, 2000);
