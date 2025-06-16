#!/usr/bin/env node

const net = require('net');

// Test script to verify GET UIN packet functionality
function createGetUinPacket(nickname) {
    // Create GET UIN packet: packet type (-1131) + nickname
    const packetType = Buffer.alloc(4);
    packetType.writeInt32LE(-1131, 0); // GET_UIN packet type
    
    const nicknameBuffer = Buffer.from(nickname, 'utf8');
    const payload = Buffer.concat([packetType, nicknameBuffer]);
    
    return payload;
}

function testGetUin(nickname = 'TestUser') {
    console.log(`🧪 Testing GET UIN packet for nickname: "${nickname}"`);
    
    const client = new net.Socket();
    
    client.connect(5001, 'localhost', () => {
        console.log('✅ Connected to Paltalk server on port 5001');
        
        // Send GET UIN packet
        const packet = createGetUinPacket(nickname);
        console.log(`📤 Sending GET UIN packet (${packet.length} bytes)`);
        console.log(`   Packet type: -1131 (GET_UIN)`);
        console.log(`   Nickname: "${nickname}"`);
        
        client.write(packet);
    });
    
    client.on('data', (data) => {
        console.log('📥 Received response:');
        console.log(`   Raw data (${data.length} bytes):`, data);
        console.log(`   As string: "${data.toString('utf8')}"`);
        
        // Parse response if it looks like old format
        const response = data.toString('utf8');
        if (response.includes('uid=') && response.includes('nickname=')) {
            console.log('✅ Response matches old implementation format!');
            const lines = response.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    console.log(`   ${line}`);
                }
            });
        } else {
            console.log('❓ Response format differs from expected old implementation');
        }
        
        client.destroy();
    });
    
    client.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
    });
    
    client.on('close', () => {
        console.log('🔌 Connection closed');
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
        if (!client.destroyed) {
            console.log('⏰ Test timeout - closing connection');
            client.destroy();
        }
    }, 5000);
}

// Run the test
if (require.main === module) {
    const nickname = process.argv[2] || 'TestUser';
    testGetUin(nickname);
}

module.exports = { testGetUin, createGetUinPacket };
