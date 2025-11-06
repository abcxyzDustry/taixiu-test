const fs = require('fs');
const path = require('path');

console.log('🔍 DEBUG RENDER BUILD PROCESS');
console.log('================================');

// 1. Kiểm tra current directory
console.log('\n1. 📁 CURRENT DIRECTORY:');
console.log('   Path:', __dirname);
console.log('   Files:', fs.readdirSync(__dirname));

// 2. Kiểm tra parent directory và tìm public
console.log('\n2. 📁 PARENT DIRECTORY:');
try {
    const parentPath = path.join(__dirname, '..');
    const parentFiles = fs.readdirSync(parentPath);
    console.log('   Files:', parentFiles);
    
    // 3. Kiểm tra public folder trong parent directory
    console.log('\n3. 📁 PUBLIC FOLDER ANALYSIS:');
    const publicPath = path.join(parentPath, 'public'); // SỬA Ở ĐÂY
    
    if (fs.existsSync(publicPath)) {
        console.log('   ✅ public/ EXISTS at:', publicPath);
        const publicFiles = fs.readdirSync(publicPath);
        console.log('   Files in public/:', publicFiles);
        
        // Kiểm tra từng file/folder trong public
        publicFiles.forEach(file => {
            const filePath = path.join(publicPath, file);
            const stat = fs.statSync(filePath);
            console.log(`   ${stat.isDirectory() ? '📁' : '📄'} ${file}`);
            
            // Nếu là folder, kiểm tra bên trong
            if (stat.isDirectory()) {
                try {
                    const subFiles = fs.readdirSync(filePath);
                    console.log(`      📄 ${subFiles.slice(0, 5).join(', ')}${subFiles.length > 5 ? '...' : ''}`);
                    
                    // Kiểm tra xem có index.html không
                    if (subFiles.includes('index.html')) {
                        console.log(`      ✅ FOUND index.html in ${file}/`);
                    }
                } catch (e) {
                    console.log(`      ❌ Cannot read: ${e.message}`);
                }
            }
        });
    } else {
        console.log('   ❌ public/ DOES NOT EXIST at:', publicPath);
    }
} catch (e) {
    console.log('   ❌ Error:', e.message);
}

console.log('\n================================');
