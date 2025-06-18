const WebSocket = require('ws');
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: response, text: () => responseData });
                } catch (error) {
                    resolve({ ok: false, data: null, text: () => responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Test script to verify bots are properly removed from room user lists
async function testBotRemoval() {
    console.log('Starting bot removal test...');
    
    // Step 1: Start some bots via API
    console.log('Step 1: Starting 3 bots...');
    try {
        const startResponse = await makeRequest('POST', '/api/bots/start', { 
            botCount: 3,
            chatFrequencyMs: 10000,
            moveFrequencyMs: 60000,
            distributionMode: 'single_room',
            targetRoomId: 50001  // The Royal Oak
        });
        
        if (startResponse.ok) {
            console.log('✅ Bots started successfully');
        } else {
            console.log('❌ Failed to start bots:', startResponse.text());
            return;
        }
    } catch (error) {
        console.log('❌ Error starting bots:', error.message);
        return;
    }
    
    // Wait a moment for bots to connect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Connect as observer client
    console.log('Step 2: Connecting observer client...');
    const ws = new WebSocket('ws://localhost:5001');
    
    ws.on('open', () => {
        console.log('✅ Observer client connected');
        
        // Send join room packet (room ID 50001 - The Royal Oak)
        const joinBuffer = Buffer.alloc(4);
        joinBuffer.writeUInt32LE(50001, 0); // Room ID 50001
        sendPacket(ws, 0x0030, joinBuffer);
    });
    
    ws.on('message', (data) => {
        try {
            const header = data.readUInt16LE(0);
            const packetType = data.readUInt16LE(2);
            
            console.log(`📦 Received packet: 0x${packetType.toString(16).padStart(4, '0')}`);
            
            if (packetType === 0x0031) { // Room joined
                console.log('✅ Successfully joined room');
            } else if (packetType === 0x0032) { // User list update
                const userCount = data.readUInt32LE(4);
                console.log(`👥 User list update - ${userCount} users in room:`);
                
                let offset = 8;
                for (let i = 0; i < userCount; i++) {
                    const uid = data.readUInt32LE(offset);
                    offset += 4;
                    
                    const nicknameLength = data.readUInt8(offset);
                    offset += 1;
                    const nickname = data.toString('utf8', offset, offset + nicknameLength);
                    offset += nicknameLength;
                    
                    const color = data.readUInt32LE(offset);
                    offset += 4;
                    
                    console.log(`  - ${nickname} (UID: ${uid}, Color: #${color.toString(16).padStart(6, '0')})`);
                }
            } else if (packetType === 0x0140) { // User left
                const uid = data.readUInt32LE(4);
                const nicknameLength = data.readUInt8(8);
                const nickname = data.toString('utf8', 9, 9 + nicknameLength);
                console.log(`👋 User left: ${nickname} (UID: ${uid})`);
            }
        } catch (error) {
            console.log('Error parsing packet:', error.message);
        }
    });
    
    ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
    });
    
    // Step 3: Wait for initial user list, then stop bots
    setTimeout(async () => {
        console.log('\nStep 3: Stopping all bots...');
        try {
            const stopResponse = await makeRequest('POST', '/api/bots/stop', {});
            
            if (stopResponse.ok) {
                console.log('✅ Stop bots request sent');
            } else {
                console.log('❌ Failed to stop bots:', stopResponse.text());
            }
        } catch (error) {
            console.log('❌ Error stopping bots:', error.message);
        }
        
        // Wait for removal to complete, then close
        setTimeout(() => {
            console.log('\nTest completed. Closing observer client...');
            ws.close();
        }, 3000);
        
    }, 5000);
}

function sendPacket(ws, packetType, data) {
    const header = Buffer.alloc(4);
    header.writeUInt16LE(data.length + 4, 0); // Length including header
    header.writeUInt16LE(packetType, 2);
    
    const packet = Buffer.concat([header, data]);
    ws.send(packet);
}

testBotRemoval().catch(console.error);
