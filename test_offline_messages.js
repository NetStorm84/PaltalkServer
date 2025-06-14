/**
 * Test script to verify offline message functionality
 * This simulates a user login to trigger offline message delivery
 */

const net = require('net');
const { PACKET_TYPES } = require('./packetHeaders');

// User credentials for testing (user 1000002 should receive the offline message)
const TEST_USER = {
    uid: 1000002,
    nickname: 'NetStorm',
    email: 'default@example.com',
    password: 'password123'
};

function sendPacket(socket, type, data) {
    const header = Buffer.allocUnsafe(4);
    header.writeInt16LE(type, 0);
    header.writeUInt16LE(data.length, 2);
    socket.write(Buffer.concat([header, data]));
}

function createLoginPacket(uid, nickname, email, password) {
    const loginData = `${uid}\n${nickname}\n${email}\npassword`;
    return Buffer.from(loginData, 'utf8');
}

function testOfflineMessages() {
    console.log('🧪 Testing offline message delivery...');
    console.log(`👤 Logging in as user ${TEST_USER.uid} (${TEST_USER.nickname})`);
    
    const client = new net.Socket();
    
    client.connect(5001, 'localhost', () => {
        console.log('✅ Connected to server');
        
        // Send login packet
        const loginPacket = createLoginPacket(
            TEST_USER.uid,
            TEST_USER.nickname,
            TEST_USER.email,
            TEST_USER.password
        );
        
        console.log('📤 Sending login packet...');
        sendPacket(client, PACKET_TYPES.LOGIN, loginPacket);
    });
    
    client.on('data', (data) => {
        try {
            let offset = 0;
            
            while (offset < data.length) {
                if (data.length - offset < 4) break;
                
                const type = data.readInt16LE(offset);
                const length = data.readUInt16LE(offset + 2);
                offset += 4;
                
                if (data.length - offset < length) break;
                
                const payload = data.slice(offset, offset + length);
                offset += length;
                
                console.log(`📨 Received packet: Type=${type}, Length=${length}`);
                
                // Check for instant message (IM_IN) packets
                if (type === PACKET_TYPES.IM_IN) {
                    console.log('📥 OFFLINE MESSAGE RECEIVED!');
                    console.log(`   Payload (hex): ${payload.toString('hex')}`);
                    
                    // Parse the message
                    if (payload.length >= 4) {
                        const senderUid = payload.readUInt32LE(0);
                        const messageContent = payload.slice(4).toString('utf8');
                        console.log(`   From user: ${senderUid}`);
                        console.log(`   Content: "${messageContent}"`);
                    }
                } else {
                    console.log(`   Payload: ${payload.toString('hex').substring(0, 40)}${payload.length > 20 ? '...' : ''}`);
                }
            }
        } catch (error) {
            console.error('❌ Error parsing packet:', error);
        }
    });
    
    client.on('close', () => {
        console.log('🔌 Connection closed');
    });
    
    client.on('error', (error) => {
        console.error('❌ Connection error:', error);
    });
    
    // Auto-disconnect after 10 seconds
    setTimeout(() => {
        console.log('⏰ Test timeout - disconnecting');
        client.destroy();
        process.exit(0);
    }, 10000);
}

if (require.main === module) {
    testOfflineMessages();
}

module.exports = { testOfflineMessages };
