/**
 * Test script to verify that bots are properly removed from room user lists when stopped
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function sendRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return await response.json();
}

async function testBotUserListRemoval() {
    console.log('🤖 Testing bot user list removal...\n');
    
    try {
        // 1. Start some bots
        console.log('1. Starting 5 bots...');
        const startResult = await sendRequest('/api/bots/start', 'POST', {
            botCount: 5,
            chatFrequencyMs: 10000,
            moveFrequencyMs: 60000,
            distributionMode: 'single_room',
            targetRoomId: 50001 // The Royal Oak
        });
        
        if (startResult.success) {
            console.log(`✅ Started ${startResult.data.botCount} bots successfully`);
        } else {
            console.log(`❌ Failed to start bots: ${startResult.error}`);
            return;
        }
        
        // 2. Wait a moment for bots to settle
        console.log('\n2. Waiting 3 seconds for bots to settle...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. Check bot stats
        console.log('\n3. Checking bot stats...');
        const statsResult = await sendRequest('/api/bots/stats');
        if (statsResult.success) {
            console.log(`📊 Total bots: ${statsResult.data.totalBots}`);
            console.log(`📍 Rooms with bots: ${statsResult.data.roomsWithBots || 0}`);
            if (statsResult.data.roomDistribution) {
                console.log('📈 Distribution:', statsResult.data.roomDistribution);
            }
        } else {
            console.log(`❌ Failed to get stats: ${statsResult.error}`);
        }
        
        // 4. Stop all bots
        console.log('\n4. Stopping all bots...');
        const stopResult = await sendRequest('/api/bots/stop', 'POST', {});
        
        if (stopResult.success) {
            console.log(`✅ Stopped ${stopResult.data.stoppedCount || 0} bots successfully`);
        } else {
            console.log(`❌ Failed to stop bots: ${stopResult.error}`);
            return;
        }
        
        // 5. Wait a moment for cleanup
        console.log('\n5. Waiting 2 seconds for cleanup...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 6. Check stats again to confirm cleanup
        console.log('\n6. Checking bot stats after stop...');
        const finalStatsResult = await sendRequest('/api/bots/stats');
        if (finalStatsResult.success) {
            console.log(`📊 Total bots: ${finalStatsResult.data.totalBots}`);
            console.log(`📍 Rooms with bots: ${finalStatsResult.data.roomsWithBots || 0}`);
            
            if (finalStatsResult.data.totalBots === 0) {
                console.log('\n✅ SUCCESS: All bots were properly stopped and removed!');
            } else {
                console.log('\n⚠️ WARNING: Some bots may still be present');
            }
        } else {
            console.log(`❌ Failed to get final stats: ${finalStatsResult.error}`);
        }
        
        console.log('\n🎯 Test completed. Check the Paltalk client to verify that bots are no longer visible in room user lists.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testBotUserListRemoval();
