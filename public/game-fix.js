// src/public/game-fix.js
(function() {
    'use strict';
    
    console.log('🎮 Game Fix loading...');
    
    // Fix WebSocket connection
    if (typeof io !== 'undefined') {
        window.safeWebSocketConnect = function() {
            try {
                var socket = io('wss://one11bet-websocket.onrender.com', {
                    transports: ['websocket'],
                    timeout: 10000,
                    reconnection: true,
                    reconnectionAttempts: 3
                });
                
                socket.on('connect', function() {
                    console.log('✅ WebSocket connected');
                });
                
                socket.on('connect_error', function(error) {
                    console.log('❌ WebSocket error:', error);
                });
                
                return socket;
            } catch (error) {
                console.log('❌ WebSocket init error:', error);
                return null;
            }
        };
        
        // Auto connect
        setTimeout(function() {
            window.safeWebSocketConnect();
        }, 1000);
    }
    
    // Fix for onInfoClick error
    window.safeOnInfoClick = function() {
        console.log('🔍 Info button clicked (safe)');
        // Add your safe info logic here
        // For example: show a popup, log info, etc.
    };
    
    // Fix for onClickNext error
    window.safeOnClickNext = function() {
        console.log('⏭️ Next button clicked (safe)');
        // Add your safe next logic here
        // For example: go to next scene, increment level, etc.
    };
    
    console.log('✅ Game Fix loaded successfully');
})();
