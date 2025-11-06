const fs = require('fs');
const path = require('path');

console.log('🎮 CHECKING GAME FILES STRUCTURE:');
console.log('================================');

// Kiểm tra thư mục public
console.log('\n📂 PUBLIC DIRECTORY:');
function checkPublicDir(dir, depth = 0) {
    const prefix = '  '.repeat(depth);
    try {
        const files = fs.readdirSync(dir);
        
        if (files.length === 0) {
            console.log(prefix + '❌ Thư mục trống!');
            return;
        }
        
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                console.log(prefix + '📁 ' + file + '/');
                // Chỉ hiển thị 2 level để không quá nhiều
                if (depth < 2 && file !== 'node_modules') {
                    checkPublicDir(fullPath, depth + 1);
                }
            } else {
                const size = (stat.size / 1024).toFixed(2) + ' KB';
                console.log(prefix + '📄 ' + file + ` (${size})`);
            }
        });
    } catch (e) {
        console.log(prefix + '❌ Không thể đọc thư mục: ' + dir);
        console.log(prefix + '💡 Lỗi: ' + e.message);
    }
}

// Kiểm tra xem thư mục public có tồn tại không
if (fs.existsSync('./public')) {
    checkPublicDir('./public');
} else {
    console.log('❌ Thư mục public không tồn tại!');
    console.log('💡 Tạo thư mục: mkdir public');
}

// Kiểm tra file quan trọng
console.log('\n🔍 IMPORTANT FILES CHECK:');
const importantFiles = [
    { path: './public/index.html', name: 'index.html' },
    { path: './public/main.js', name: 'main.js' },
    { path: './public/cocos2d-js.js', name: 'cocos2d-js.js' },
    { path: './public/cocos2d-js-min.js', name: 'cocos2d-js-min.js' },
    { path: './public/src/settings.js', name: 'settings.js' }
];

importantFiles.forEach(file => {
    const exists = fs.existsSync(file.path);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${file.name}`);
});

console.log('\n💡 KẾT LUẬN:');
if (fs.existsSync('./public/index.html')) {
    console.log('✅ Có file HTML - Game có thể hiển thị được');
} else {
    console.log('❌ Thiếu file HTML - Game không thể hiển thị');
}
