let validator = require('validator');
let User      = require('../Models/Admin');
let helpers   = require('../Helpers/Helpers');
let getConfig = require('../Helpers/Helpers').getConfig;
let setConfig = require('../Helpers/Helpers').setConfig;

// Socket.IO client for admin
const io = require('socket.io-client');
const SOCKET_SERVER = 'https://one11bet-websocket.onrender.com';

// Authenticate function (giữ nguyên)
let authenticate = function(client, data, callback) {
    // GIỮ NGUYÊN TOÀN BỘ CODE AUTHENTICATE HIỆN CÓ
    if (!!data && !!data.username && !!data.password) {
        let username = ''+data.username+'';
        let password = ''+data.password+'';
        let captcha  = data.captcha;
        let az09     = new RegExp('^[a-zA-Z0-9]+$');
        let testName = az09.test(username);

        if (!validator.isLength(username, {min: 3, max: 32})) {
            callback({title:'ĐĂNG NHẬP', text:'Tài khoản (3-32 kí tự).'}, false);
        }else if (!validator.isLength(password, {min: 5, max: 32})) {
            callback({title:'ĐĂNG NHẬP', text:'Mật khẩu (6-32 kí tự)'}, false);
        }else if (!testName) {
            callback({title:'ĐĂNG NHẬP', text:'Tên đăng nhập chỉ gồm kí tự và số !!'}, false);
        } else {
            let configAdmin = getConfig('admin');
            if (!!configAdmin && configAdmin.anti === true) {
                callback({title:'CẢNH BÁO', text:'Bạn hoặc ai đó đang cố đăng nhập trái phép. khóa đăng nhập được kích hoạt...'}, false);	
            }else{
                try {
                    username = username.toLowerCase();
                    User.findOne({'username':username}, function(err, user){
                        if (!!user) {
                            if (void 0 !== user.fail && user.fail > 3) {
                                if (!captcha || !client.c_captcha) {
                                    client.c_captcha('signIn');
                                    callback({title:'ĐĂNG NHẬP', text:'Phát hiện truy cập trái phép, vui lòng nhập captcha để tiếp tục.'}, false);	
                                }else{
                                    let checkCLogin = new RegExp('^' + client.captcha + '$', 'i');
                                    checkCLogin     = checkCLogin.test(captcha);
                                    if (checkCLogin) {
                                        if (user.validPassword(password)){
                                            user.fail = 0;
                                            user.save();
                                            client.UID = user._id.toString();
                                            callback(false, true);
                                        }else{
                                            client.c_captcha('signIn');
                                            user.fail += 1;
                                            user.save();
                                            callback({title:'ĐĂNG NHẬP', text:'Mật khẩu không chính xác!!'}, false);
                                        }
                                    }else{
                                        user.fail += 1;
                                        user.save();
                                        client.c_captcha('signIn');
                                        callback({title:'ĐĂNG NHẬP', text:'Captcha không đúng...'}, false);	
                                    }
                                    if (user.fail > 6) {
                                        configAdmin = {'anti': true};
                                        setConfig('admin', configAdmin);
                                        callback({title:'ĐĂNG NHẬP', text:'Phát hiện truy cập trái phép, Đóng đăng nhập.'}, false);	
                                        return void 0;
                                    }
                                }
                            }else{
                                if (user.validPassword(password)){
                                    user.fail = 0;
                                    user.save();
                                    client.UID = user._id.toString();
                                    callback(false, true);
                                }else{
                                    user.fail  = user.fail>>0;
                                    user.fail += 1;
                                    user.save();
                                    callback({title:'ĐĂNG NHẬP', text:'Mật khẩu không chính xác!!'}, false);
                                }
                            }
                        }else{
                            callback({title:'ĐĂNG NHẬP', text:'Tài Khoản hoặc mật khẩu không chính xác!!'}, false);
                        }
                    });
                } catch (error) {
                    callback({title:'THÔNG BÁO', text:'Có lỗi sảy ra, vui lòng kiểm tra lại!!'}, false);
                }
            }
        }
    }
};

module.exports = function(ws, redT){
    console.log('🔧 Initializing Admin Socket.IO connection...');
    
    // Initialize Socket.IO connection
    const adminSocket = io(SOCKET_SERVER, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5
    });

    ws.admin = true;
    ws.auth  = false;
    ws.UID   = null;
    ws.captcha   = {};
    ws.socketIO = adminSocket; // Store Socket.IO instance
    
    // Socket.IO event handlers
    adminSocket.on('connect', () => {
        console.log('✅ Admin connected to Socket.IO server:', SOCKET_SERVER);
        ws.red({ type: 'connection', status: 'connected', server: SOCKET_SERVER });
    });

    adminSocket.on('disconnect', (reason) => {
        console.log('❌ Admin disconnected from Socket.IO:', reason);
        ws.red({ type: 'connection', status: 'disconnected' });
    });

    adminSocket.on('connect_error', (error) => {
        console.log('❌ Admin Socket.IO connection error:', error);
        ws.red({ type: 'connection', status: 'error', message: error.message });
    });

    // Handle messages from Socket.IO server
    adminSocket.on('admin_response', (data) => {
        console.log('📨 Received admin response:', data);
        ws.red(data);
    });

    adminSocket.on('game_stats', (data) => {
        console.log('📊 Received game stats:', data);
        ws.red({ type: 'stats', data: data });
    });

    adminSocket.on('broadcast_result', (data) => {
        console.log('📢 Broadcast result:', data);
        ws.red({ type: 'broadcast', data: data });
    });

    // Original red function
    ws.red = function(data){
        try {
            this.readyState == 1 && this.send(JSON.stringify(data));
        } catch(err) {
            console.log('Send error:', err);
        }
    }

    ws.on('message', function(message) {
        try {
            if (!!message) {
                message = JSON.parse(message);
                
                if (!!message.captcha) {
                    this.c_captcha(message.captcha);
                }
                
                if (this.auth == false && !!message.authentication) {
                    authenticate(this, message.authentication, function(err, success) {
                        if (success) {
                            ws.auth = true;
                            ws.redT = redT;
                            
                            // Notify Socket.IO server about admin authentication
                            if (adminSocket.connected) {
                                adminSocket.emit('admin_authenticated', {
                                    uid: ws.UID,
                                    username: message.authentication.username,
                                    type: 'admin'
                                });
                            }
                            
                            if (void 0 !== ws.redT.admins[ws.UID]) {
                                ws.redT.admins[ws.UID].push(ws);
                            }else{
                                ws.redT.admins[ws.UID] = [ws];
                            }
                            
                            // Call auth with Socket.IO
                            require('./socket.js').auth(ws);
                        } else if (!!err) {
                            ws.red({unauth: err});
                        } else {
                            ws.red({unauth: {message:'Authentication failure'}});
                        }
                    });
                }else if(!!this.auth){
                    // Forward message to Socket.IO server
                    if (adminSocket.connected) {
                        adminSocket.emit('admin_command', {
                            uid: this.UID,
                            command: message
                        });
                    } else {
                        ws.red({ error: 'Not connected to server' });
                    }
                }
            }
        } catch (error) {
            console.log('Message processing error:', error);
        }
    });

    ws.on('close', function(message) {
        console.log('🔌 Admin WebSocket closed');
        
        // Close Socket.IO connection
        if (this.socketIO) {
            this.socketIO.disconnect();
        }
        
        // Original cleanup code
        if (this.UID !== null && void 0 !== this.redT.admins[this.UID]) {
            if (this.redT.admins[this.UID].length === 1 && this.redT.admins[this.UID][0] === this) {
                delete this.redT.admins[this.UID];
                if (this.redT) {
                    delete this.redT;
                }
            }else{
                var self = this;
                this.redT.admins[this.UID].forEach(function(obj, index){
                    if (obj === self) {
                        self.redT.admins[self.UID].splice(index, 1);
                        if (self.redT) {
                            delete self.redT;
                        }
                    }
                });
            }
        }
        this.auth = false;
    });
};

// Auth function for authenticated admin
module.exports.auth = function(client) {
    console.log('🎮 Admin authenticated, setting up game connection...');
    
    if (client.socketIO && client.socketIO.connected) {
        // Admin is already connected via Socket.IO
        client.red({ 
            auth: true, 
            message: 'Admin authenticated successfully',
            connection: 'socketio'
        });
    } else {
        client.red({ 
            auth: true, 
            message: 'Admin authenticated but Socket.IO not connected',
            connection: 'websocket'
        });
    }
};

// Message handler for authenticated admin
module.exports.message = function(client, message) {
    console.log('📤 Admin command:', message);
    
    // Forward to Socket.IO server if connected
    if (client.socketIO && client.socketIO.connected) {
        client.socketIO.emit('admin_command', {
            uid: client.UID,
            command: message,
            timestamp: new Date()
        });
    } else {
        client.red({ error: 'Socket.IO not connected', command: message });
    }
};
