const fs = require('fs');
const path = require('path');

console.log('🔍 DEBUG RENDER BUILD PROCESS');
console.log('================================');

// 1. Kiểm tra current directory
console.log('\n1. 📁 CURRENT DIRECTORY:');
console.log('   Path:', __dirname);
console.log('   Files:', fs.readdirSync(__dirname));

// 2. Kiểm tra parent directory
console.log('\n2. 📁 PARENT DIRECTORY:');
try {
    const parentFiles = fs.readdirSync(path.join(__dirname, '..'));
    console.log('   Files:', parentFiles);
} catch (e) {
    console.log('   ❌ Error:', e.message);
}

// 3. Kiểm tra public folder chi tiết
console.log('\n3. 📁 PUBLIC FOLDER ANALYSIS:');
const publicPath = './public';
try {
    if (fs.existsSync(publicPath)) {
        console.log('   ✅ public/ EXISTS');
        const publicFiles = fs.readdirSync(publicPath);
        console.log('   Files in public/:', publicFiles);
        
        // Kiểm tra từng file/folder trong public
        publicFiles.forEach(file => {
            const filePath = path.join(publicPath, file);
            const stat = fs.statSync(filePath);
            console.log(`   ${stat.isDirectory() ? '📁' : '📄'} ${file} - ${stat.size} bytes`);
            
            // Nếu là folder, kiểm tra bên trong
            if (stat.isDirectory()) {
                try {
                    const subFiles = fs.readdirSync(filePath);
                    console.log(`      📄 ${subFiles.slice(0, 5).join(', ')}${subFiles.length > 5 ? '...' : ''}`);
                } catch (e) {
                    console.log(`      ❌ Cannot read: ${e.message}`);
                }
            }
        });
    } else {
        console.log('   ❌ public/ DOES NOT EXIST');
        
        // Kiểm tra các folder khác
        console.log('\n4. 🔍 SEARCHING FOR GAME FILES:');
        const allFiles = fs.readdirSync('.');
        allFiles.forEach(file => {
            if (file.includes('cocos') || file.includes('game') || file.includes('web')) {
                console.log(`   🔎 Found: ${file}`);
            }
        });
    }
} catch (e) {
    console.log('   ❌ Error accessing public/:', e.message);
}

// 4. Kiểm tra file permissions
console.log('\n4. 🔐 FILE PERMISSIONS:');
try {
    if (fs.existsSync(publicPath)) {
        fs.accessSync(publicPath, fs.constants.R_OK);
        console.log('   ✅ public/ is readable');
    }
} catch (e) {
    console.log('   ❌ public/ is NOT readable:', e.message);
}

console.log('\n================================');
