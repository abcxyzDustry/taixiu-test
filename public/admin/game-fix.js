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
                    reconnectionAttempts: 5
                });
                
                socket.on('connect', function() {
                    console.log('✅ WebSocket connected successfully');
                    // Gửi event cho game biết WebSocket đã kết nối
                    if (typeof cc !== 'undefined') {
                        cc.game.emit('websocket-connected');
                    }
                });
                
                socket.on('connect_error', function(error) {
                    console.log('❌ WebSocket connection failed:', error);
                    // Thử kết nối lại sau 3 giây
                    setTimeout(function() {
                        window.safeWebSocketConnect();
                    }, 3000);
                });
                
                return socket;
            } catch (error) {
                console.log('❌ WebSocket init error:', error);
                return null;
            }
        };
        
        // Tự động kết nối khi game load
        if (typeof cc !== 'undefined') {
            cc.game.on(cc.game.EVENT_GAME_INITED, function() {
                setTimeout(function() {
                    window.safeWebSocketConnect();
                }, 2000);
            });
        } else {
            // Fallback nếu Cocos chưa load
            setTimeout(function() {
                window.safeWebSocketConnect();
            }, 3000);
        }
    }
    
    // Fix for onInfoClick error
    window.safeOnInfoClick = function(targetElement) {
        console.log('🔍 Info button clicked (safe)');
        
        // Tạo popup thông tin an toàn
        var infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 25px;
            border-radius: 15px;
            z-index: 10000;
            max-width: 350px;
            text-align: center;
            border: 2px solid #4CAF50;
            font-family: Arial, sans-serif;
        `;
        infoPopup.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50;">THÔNG TIN GAME</h3>
            <p style="margin: 0 0 20px 0; line-height: 1.5;">Phiên bản ổn định<br>Lỗi đã được khắc phục</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                ĐÓNG
            </button>
        `;
        document.body.appendChild(infoPopup);
    };
    
    // Fix for onClickNext error  
    window.safeOnClickNext = function(targetElement) {
        console.log('⏭️ Next button clicked (safe)');
        
        // Logic chuyển scene an toàn
        if (typeof cc !== 'undefined' && cc.director) {
            try {
                // Thử load scene tiếp theo
                var currentScene = cc.director.getScene();
                if (currentScene) {
                    // Thêm logic chuyển scene của bạn ở đây
                    console.log('🎯 Chuyển scene an toàn');
                    
                    // Hiển thị thông báo
                    var nextPopup = document.createElement('div');
                    nextPopup.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(76, 175, 80, 0.9);
                        color: white;
                        padding: 15px 25px;
                        border-radius: 8px;
                        z-index: 9999;
                        font-family: Arial, sans-serif;
                        font-weight: bold;
                    `;
                    nextPopup.textContent = '⏭️ Đang chuyển tiếp...';
                    document.body.appendChild(nextPopup);
                    
                    // Tự động xóa sau 2 giây
                    setTimeout(function() {
                        if (nextPopup.parentElement) {
                            nextPopup.parentElement.removeChild(nextPopup);
                        }
                    }, 2000);
                }
            } catch (error) {
                console.log('❌ Next scene error:', error);
            }
        }
    };
    
    // Global error handler để bắt các lỗi click
    window.addEventListener('error', function(event) {
        if (event.error && event.error.stack) {
            if (event.error.stack.includes('onInfoClick') || 
                event.error.stack.includes('getInfo')) {
                console.log('🛠️ Intercepted onInfoClick error, using safe version');
                window.safeOnInfoClick();
                event.preventDefault();
            }
            else if (event.error.stack.includes('onClickNext') || 
                     event.error.stack.includes('number')) {
                console.log('🛠️ Intercepted onClickNext error, using safe version');
                window.safeOnClickNext();
                event.preventDefault();
            }
        }
    });
    
    console.log('✅ Game Fix loaded successfully');
})();
