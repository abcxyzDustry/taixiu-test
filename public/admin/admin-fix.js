// admin-fix.js - Load TRƯỚC mọi script khác
(function() {
    'use strict';
    
    console.log('🛡️ Loading ULTIMATE Admin WebSocket Fix...');
    
    // Chặn WebSocket từ rất sớm
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
        // CHẶN TRIỆT ĐỂ mọi localhost connection
        if (url && (
            url.includes('127.0.0.1') || 
            url.includes('localhost') || 
            url.includes('ws://127.0.0.1/redtcp') ||
            url.startsWith('ws://127.0.0.1') ||
            url.startsWith('ws://localhost')
        )) {
            console.log('🚫 BLOCKED WebSocket:', url);
            
            // Return dead WebSocket object
            const deadSocket = {
                readyState: 3, // CLOSED
                url: url,
                bufferedAmount: 0,
                extensions: '',
                protocol: '',
                onopen: null,
                onmessage: null,
                onerror: null,
                onclose: null,
                
                send: function(data) {
                    console.log('🚫 BLOCKED WebSocket send:', data);
                    return false;
                },
                close: function() {
                    console.log('🚫 BLOCKED WebSocket close');
                    return null;
                },
                addEventListener: function(type, listener) {
                    console.log('🚫 BLOCKED WebSocket addEventListener:', type);
                    if (type === 'open') {
                        // Never call open - simulate immediate failure
                        setTimeout(() => {
                            if (this.onerror) this.onerror(new Event('error'));
                            if (listener) listener(new Event('error'));
                        }, 10);
                    }
                },
                removeEventListener: function() {},
                dispatchEvent: function() { return false; }
            };
            
            // Trigger error immediately
            setTimeout(() => {
                if (deadSocket.onerror) {
                    deadSocket.onerror(new Event('error'));
                }
            }, 50);
            
            return deadSocket;
        }
        
        // Allow legitimate WebSockets
        return new originalWebSocket(url, protocols);
    };
    
    // Preserve WebSocket constants
    Object.keys(originalWebSocket).forEach(key => {
        window.WebSocket[key] = originalWebSocket[key];
    });
    
    console.log('✅ ULTIMATE WebSocket Blocker activated!');
})();
