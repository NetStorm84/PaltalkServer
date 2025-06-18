const net = require('net');
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

// Simple bot removal test focusing on the API functionality
async function testBotRemoval() {
    console.log('🤖 Testing bot removal functionality...\n');
    
    try {
        // Step 1: Start some bots via API
        console.log('Step 1: Starting 3 bots...');
        console.log('   Making request to /api/bots/start...');
        const startResponse = await makeRequest('POST', '/api/bots/start', { 
            botCount: 3,
            chatFrequencyMs: 10000,
            moveFrequencyMs: 60000,
            distributionMode: 'single_room',
            targetRoomId: 50001  // The Royal Oak
        });
        console.log('   Got response from start request');
        
        if (startResponse.ok && startResponse.data.success) {
            console.log('✅ Bots started successfully');
            console.log(`   Started ${startResponse.data.data.activeBots} bots`);
        } else {
            console.log('❌ Failed to start bots:', startResponse.text());
            return;
        }
        
        // Step 2: Wait a moment for bots to settle
        console.log('\nStep 2: Waiting 3 seconds for bots to settle...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Check bot stats before stopping
        console.log('\nStep 3: Checking bot stats before stopping...');
        const statsResponse = await makeRequest('GET', '/api/bots/stats');
        if (statsResponse.ok && statsResponse.data.success) {
            const stats = statsResponse.data.data;
            console.log(`📊 Total bots: ${stats.totalBots}`);
            console.log(`📍 Rooms with bots: ${Object.keys(stats.roomDistribution || {}).length}`);
            if (stats.roomDistribution) {
                console.log('📈 Distribution:', stats.roomDistribution);
            }
        }
        
        // Step 4: Stop all bots
        console.log('\nStep 4: Stopping all bots...');
        const stopResponse = await makeRequest('POST', '/api/bots/stop', {});
        
        if (stopResponse.ok && stopResponse.data.success) {
            console.log('✅ Stop bots request sent successfully');
            console.log(`   Stopped ${stopResponse.data.data.stoppedCount} bots`);
        } else {
            console.log('❌ Failed to stop bots:', stopResponse.text());
        }
        
        // Step 5: Wait for cleanup and verify
        console.log('\nStep 5: Waiting 2 seconds for cleanup...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 6: Check final stats
        console.log('\nStep 6: Checking bot stats after stop...');
        const finalStatsResponse = await makeRequest('GET', '/api/bots/stats');
        if (finalStatsResponse.ok && finalStatsResponse.data.success) {
            const finalStats = finalStatsResponse.data.data;
            console.log(`📊 Total bots: ${finalStats.totalBots}`);
            console.log(`📍 Rooms with bots: ${Object.keys(finalStats.roomDistribution || {}).length}`);
            
            if (finalStats.totalBots === 0) {
                console.log('\n✅ SUCCESS: All bots were properly stopped and removed!');
                console.log('✅ Bot removal fix appears to be working correctly');
            } else {
                console.log('\n⚠️ WARNING: Some bots may still be present');
                if (finalStats.roomDistribution) {
                    console.log('📈 Remaining distribution:', finalStats.roomDistribution);
                }
            }
        } else {
            console.log('❌ Failed to get final stats:', finalStatsResponse.text());
        }

    } catch (error) {
        console.log('❌ Error during test:', error.message);
    }
}

// Run the test
testBotRemoval();
