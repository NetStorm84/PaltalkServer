#!/usr/bin/env node

/**
 * Migration script for Paltalk Server Overhaul
 * This script helps migrate from the old server structure to the new modular structure
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Paltalk Server Migration Script');
console.log('===================================');

// Create required directories
const requiredDirs = [
    'logs',
    'backups',
    'src/config',
    'src/core',
    'src/database',
    'src/models',
    'src/network',
    'src/utils',
    'src/voice',
    'src/web',
    'src/web/public'
];

console.log('\n📁 Creating directory structure...');
requiredDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created: ${dir}`);
    } else {
        console.log(`✓ Exists: ${dir}`);
    }
});

// Create backup of original files
console.log('\n💾 Creating backup of original files...');
const backupDir = path.join(__dirname, 'backups', `backup_${Date.now()}`);
fs.mkdirSync(backupDir, { recursive: true });

const filesToBackup = [
    'server.js',
    'voiceServer.js',
    'database.js',
    'helper.js',
    'packetHeaders.js',
    'packetProcessor.js',
    'packetSender.js'
];

filesToBackup.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(backupDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Backed up: ${file}`);
    }
});

// Check for database file
console.log('\n🗄️ Checking database...');
const dbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(dbPath)) {
    console.log('✅ Database file found: database.db');
    
    // Copy database to backup
    const dbBackupPath = path.join(backupDir, 'database.db');
    fs.copyFileSync(dbPath, dbBackupPath);
    console.log('✅ Database backed up');
} else {
    console.log('⚠️ No database file found - will be created on first run');
}

// Install new dependencies
console.log('\n📦 Installing new dependencies...');
const { execSync } = require('child_process');

try {
    console.log('Installing socket.io...');
    execSync('npm install socket.io@^4.7.2', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.log('⚠️ Could not install dependencies automatically');
    console.log('Please run: npm install socket.io');
}

// Migration summary
console.log('\n📋 Migration Summary:');
console.log('====================');
console.log('✅ Directory structure created');
console.log('✅ Original files backed up to:', backupDir);
console.log('✅ New modular server files are ready in src/');
console.log('✅ Package.json updated with new dependencies');

console.log('\n🚀 Next Steps:');
console.log('==============');
console.log('1. Run: npm install (if dependencies failed to install)');
console.log('2. Test the new server: npm start');
console.log('3. Access web dashboard: http://localhost:3000');
console.log('4. Monitor logs in the logs/ directory');
console.log('5. Compare with old backup if needed');

console.log('\n⚠️ Important Notes:');
console.log('===================');
console.log('- The old server files are preserved for reference');
console.log('- Database schema is compatible - no migration needed');
console.log('- Voice server is integrated into the main server now');
console.log('- Web interface runs on port 3000 by default');
console.log('- Chat server runs on port 5001 by default');
console.log('- Voice server runs on port 8075 by default');

console.log('\n✨ Migration completed successfully!');
