#!/usr/bin/env node

const DatabaseManager = require('./src/database/databaseManager');

async function testUserLookup() {
    try {
        const db = new DatabaseManager();
        await db.initialize();
        
        console.log('Testing user lookups...\n');
        
        // Test looking up Dan
        const danUser = await db.getUserByNickname('Dan');
        console.log('Dan user data:', danUser ? {
            uid: danUser.uid,
            nickname: danUser.nickname,
            email: danUser.email
        } : 'Not found');
        
        // Test looking up NetStorm
        const netstormUser = await db.getUserByNickname('NetStorm');
        console.log('NetStorm user data:', netstormUser ? {
            uid: netstormUser.uid,
            nickname: netstormUser.nickname,
            email: netstormUser.email
        } : 'Not found');
        
        // Test looking up some other common names
        const testNames = ['dan', 'netstorm', 'NETSTORM', 'DAN'];
        for (const name of testNames) {
            const user = await db.getUserByNickname(name);
            console.log(`${name} ->`, user ? `UID: ${user.uid}, nickname: ${user.nickname}` : 'Not found');
        }
        
        // List all users to see what's in the database
        console.log('\n--- All users in database ---');
        const allUsersQuery = await db.query('SELECT uid, nickname, email FROM users ORDER BY uid');
        allUsersQuery.forEach(user => {
            console.log(`UID: ${user.uid}, nickname: ${user.nickname}, email: ${user.email}`);
        });
        
        await db.close();
    } catch (error) {
        console.error('Error testing user lookup:', error);
    }
}

testUserLookup();
