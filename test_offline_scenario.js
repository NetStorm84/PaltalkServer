/**
 * Test script to demonstrate offline message functionality
 * This creates a clear scenario: send message to offline user, then user logs in
 */

const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

async function runOfflineMessageTest() {
    console.log('🧪 Starting comprehensive offline message test...\n');
    
    // Step 1: Add test offline message directly to database
    console.log('📝 Step 1: Adding offline message to database...');
    const db = new sqlite3.Database('database.db');
    
    const testMessage = {
        sender: 1000001,
        receiver: 1000002,
        content: 'This is a test offline message sent at ' + new Date().toISOString()
    };
    
    await new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO offline_messages (sender, receiver, content, status) VALUES (?, ?, ?, ?)',
            [testMessage.sender, testMessage.receiver, testMessage.content, 'pending'],
            function(err) {
                if (err) {
                    console.error('❌ Failed to insert test message:', err);
                    reject(err);
                } else {
                    console.log(`✅ Test message inserted with ID: ${this.lastID}`);
                    testMessage.id = this.lastID;
                    resolve();
                }
            }
        );
    });
    
    // Step 2: Check pending messages
    console.log('\n📋 Step 2: Checking pending messages...');
    const pendingMessages = await new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM offline_messages WHERE receiver = ? AND status = ?',
            [testMessage.receiver, 'pending'],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
    
    console.log(`📨 Found ${pendingMessages.length} pending message(s) for user ${testMessage.receiver}:`);
    pendingMessages.forEach(msg => {
        console.log(`   - ID: ${msg.id}, From: ${msg.sender}, Content: "${msg.content}"`);
    });
    
    db.close();
    
    console.log('\n🎯 Test complete! Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Login as user 1000002 (NetStorm) using Paltalk client');
    console.log('3. You should receive the offline message automatically');
    console.log('4. Check database again to see message marked as "sent"');
    
    console.log('\n💡 To verify:');
    console.log('   sqlite3 database.db "SELECT * FROM offline_messages WHERE status = \'sent\' ORDER BY id DESC LIMIT 5;"');
}

if (require.main === module) {
    runOfflineMessageTest().catch(console.error);
}

module.exports = { runOfflineMessageTest };
