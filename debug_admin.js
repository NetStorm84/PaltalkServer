/**
 * Debug script to verify admin functionality
 */
const DatabaseManager = require('./src/database/databaseManager');
const { USER_PERMISSIONS } = require('./src/config/constants');

async function debugAdmin() {
    console.log('=== DEBUGGING ADMIN FUNCTIONALITY ===\n');
    
    // Check admin permission constants
    console.log('Permission Constants:');
    console.log('  REGULAR:', USER_PERMISSIONS.REGULAR);
    console.log('  MODERATOR:', USER_PERMISSIONS.MODERATOR);  
    console.log('  ADMIN:', USER_PERMISSIONS.ADMIN);
    console.log('  SUPER_ADMIN:', USER_PERMISSIONS.SUPER_ADMIN);
    console.log();
    
    // Check database admin users
    console.log('Admin users in database:');
    const db = new DatabaseManager();
    await db.init();
    
    try {
        const query = `SELECT uid, nickname, admin FROM users WHERE admin > 0`;
        const users = await db.query(query);
        
        users.forEach(user => {
            console.log(`  UID: ${user.uid}, Nickname: ${user.nickname}, Admin Level: ${user.admin}`);
            
            // Test isAdmin() logic
            const isAdmin = user.admin >= USER_PERMISSIONS.ADMIN;
            console.log(`    isAdmin() would return: ${isAdmin}`);
            console.log(`    Required for admin commands: ${USER_PERMISSIONS.ADMIN}`);
            console.log(`    Can use admin commands: ${user.admin >= USER_PERMISSIONS.ADMIN}`);
        });
        
        console.log();
        
        // Check room ownership logic
        console.log('Checking room ownership logic:');
        const rooms = await db.query('SELECT id, nm, owner FROM rooms LIMIT 5');
        rooms.forEach(room => {
            console.log(`  Room: ${room.nm} (ID: ${room.id}), Owner: ${room.owner || 'null'}`);
        });
        
    } catch (error) {
        console.error('Database error:', error);
    }
    
    await db.close();
}

debugAdmin().catch(console.error);
