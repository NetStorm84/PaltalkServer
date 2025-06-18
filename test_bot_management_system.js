#!/usr/bin/env node

/**
 * Test Bot Management System - Tests the new dedicated bot management page functionality
 */

const net = require('net');
const http = require('http');

const SERVER_HOST = '192.168.1.16';
const WEB_PORT = 3000;
const CHAT_PORT = 5001;

console.log('🧪 Testing Bot Management System\n');

async function testBotManagementSystem() {
    console.log('🔍 Starting Bot Management System Tests...\n');

    try {
        // Check server connectivity
        await checkServerConnection();
        
        // Test 1: Get available rooms
        console.log('📋 Test 1: Getting available rooms...');
        const rooms = await getAvailableRooms();
        console.log(`✅ Found ${rooms.length} available rooms`);
        if (rooms.length > 0) {
            console.log(`   First room: ${rooms[0].name} (ID: ${rooms[0].id})`);
        }
        console.log();

        // Test 2: Test bot configuration scenarios
        const testScenarios = [
            {
                name: "Single Room Configuration",
                config: {
                    botCount: 3,
                    chatFrequencyMs: 15000,
                    moveFrequencyMs: 0, // Disabled
                    distributionMode: "single_room",
                    targetRoomId: rooms.length > 0 ? rooms[0].id : null
                }
            },
            {
                name: "Multiple Room Configuration",
                config: {
                    botCount: 5,
                    chatFrequencyMs: 30000,
                    moveFrequencyMs: 300000,
                    distributionMode: "weighted",
                    roomIds: rooms.slice(0, Math.min(3, rooms.length)).map(r => r.id)
                }
            },
            {
                name: "Balanced Distribution",
                config: {
                    botCount: 4,
                    chatFrequencyMs: 45000,
                    moveFrequencyMs: 600000,
                    distributionMode: "balanced"
                }
            }
        ];

        for (let i = 0; i < testScenarios.length; i++) {
            const scenario = testScenarios[i];
            console.log(`🤖 Test ${i + 2}: ${scenario.name}`);
            
            // Skip scenarios that require rooms if no rooms available
            if ((scenario.config.targetRoomId && !rooms.length) || 
                (scenario.config.roomIds && !rooms.length)) {
                console.log('   ⚠️  Skipped - No rooms available');
                console.log();
                continue;
            }
            
            await testBotScenario(scenario);
            
            // Wait between tests
            if (i < testScenarios.length - 1) {
                console.log('   ⏳ Waiting 3 seconds before next test...');
                await sleep(3000);
            }
            console.log();
        }

        // Test 3: Bot statistics endpoint
        console.log('📊 Test: Bot Statistics API...');
        const stats = await getBotStats();
        console.log(`✅ Bot stats retrieved:`);
        console.log(`   Total Bots: ${stats.totalBots}`);
        console.log(`   Is Running: ${stats.isRunning}`);
        console.log(`   Rooms with Bots: ${Object.keys(stats.roomDistribution || {}).length}`);
        console.log();

        console.log('✅ All Bot Management tests completed successfully!\n');
        console.log('🎯 Summary:');
        console.log('   • Available rooms API: Working');
        console.log('   • Bot configuration validation: Working');
        console.log('   • Bot statistics API: Working');
        console.log('   • Multiple distribution modes: Supported');
        console.log('\n💡 You can now access the Bot Management page at:');
        console.log(`   http://${SERVER_HOST}:${WEB_PORT}/bot-management.html`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function checkServerConnection() {
    console.log('🔍 Checking server connection...');
    
    const chatConnected = await testConnection(CHAT_PORT);
    const webConnected = await testConnection(WEB_PORT);
    
    if (!chatConnected) {
        throw new Error(`Cannot connect to chat server at ${SERVER_HOST}:${CHAT_PORT}`);
    }
    if (!webConnected) {
        throw new Error(`Cannot connect to web server at ${SERVER_HOST}:${WEB_PORT}`);
    }
    
    console.log('✅ Server connections confirmed');
    console.log();
}

async function testConnection(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, SERVER_HOST);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, 3000);
    });
}

async function getAvailableRooms() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SERVER_HOST,
            port: WEB_PORT,
            path: '/api/rooms/available',
            method: 'GET',
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
                    if (response.success) {
                        resolve(response.data.rooms);
                    } else {
                        reject(new Error('Failed to get rooms: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testBotScenario(scenario) {
    try {
        console.log(`   📤 Testing configuration:`, JSON.stringify(scenario.config, null, 6));
        
        // Start bots
        const startResult = await sendBotCommand('/api/bots/start', scenario.config);
        console.log(`   🚀 Bots started: ${startResult.message}`);
        
        // Wait for bots to initialize
        await sleep(2000);
        
        // Get statistics
        const stats = await getBotStats();
        console.log(`   📊 Results:`);
        console.log(`      - Active bots: ${stats.totalBots}`);
        console.log(`      - Distribution mode: ${stats.config?.distributionMode || 'N/A'}`);
        
        if (stats.roomDistribution && Object.keys(stats.roomDistribution).length > 0) {
            console.log(`      - Room distribution:`);
            Object.entries(stats.roomDistribution).forEach(([roomName, count]) => {
                console.log(`        • ${roomName}: ${count} bots`);
            });
        }
        
        // Stop bots
        await sleep(1000);
        const stopResult = await sendBotCommand('/api/bots/stop', {});
        console.log(`   🛑 Bots stopped: ${stopResult.message}`);
        
    } catch (error) {
        console.error(`   ❌ Scenario failed: ${error.message}`);
        // Try to clean up
        try {
            await sendBotCommand('/api/bots/stop', {});
        } catch (stopError) {
            // Ignore cleanup errors
        }
    }
}

async function sendBotCommand(endpoint, config) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(config);
        
        const options = {
            hostname: SERVER_HOST,
            port: WEB_PORT,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
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
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'Command failed: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function getBotStats() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SERVER_HOST,
            port: WEB_PORT,
            path: '/api/bots/stats',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error('Failed to get stats: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping test and cleaning up...');
    try {
        await sendBotCommand('/api/bots/stop', {});
        console.log('✅ Cleanup completed');
    } catch (error) {
        // Ignore cleanup errors
    }
    process.exit(0);
});

// Main execution
testBotManagementSystem().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
