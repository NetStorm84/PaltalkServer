/**
 * Bot Manager - Creates and manages automated users (bots) for testing and ambiance
 */

const serverState = require('./serverState');
const logger = require('../utils/logger');
const { USER_MODES, BOT_CONFIG } = require('../config/constants');
const Utils = require('../utils/utils');
const User = require('../models/User');

class BotManager {
    constructor() {
        this.bots = new Map(); // botId -> bot data
        this.isRunning = false;
        this.chatInterval = null;
        this.moveInterval = null;
        this.currentConfig = null; // Store current bot configuration
        
        // Bot name generation data - More natural, random names that real users would use
        this.firstNames = [
            'alex', 'sam', 'jordan', 'casey', 'taylor', 'morgan', 'riley', 'avery', 'drew', 'blake',
            'jamie', 'chris', 'jessie', 'kelly', 'pat', 'robin', 'ash', 'jo', 'kai', 'sage',
            'sky', 'river', 'phoenix', 'rain', 'storm', 'star', 'moon', 'sun', 'blue', 'red',
            'max', 'ace', 'nick', 'mike', 'tom', 'ben', 'joe', 'dan', 'tim', 'rob',
            'lisa', 'sara', 'anna', 'emma', 'mia', 'zoe', 'eva', 'lea', 'nia', 'ada',
            'kyle', 'ryan', 'luke', 'noah', 'ethan', 'owen', 'liam', 'jack', 'leo', 'eli',
            'chloe', 'lucy', 'ruby', 'ivy', 'rose', 'lily', 'iris', 'jade', 'sage', 'hope',
            'xander', 'zane', 'knox', 'rex', 'fox', 'jax', 'dax', 'tux', 'jinx', 'onyx'
        ];
        
        this.lastNames = [
            'cool', 'hot', 'fast', 'slow', 'big', 'small', 'wild', 'calm', 'dark', 'light',
            'fire', 'ice', 'wind', 'earth', 'sea', 'sky', 'star', 'rock', 'gold', 'silver',
            'wolf', 'fox', 'cat', 'dog', 'lion', 'bear', 'bird', 'fish', 'frog', 'bee',
            'storm', 'rain', 'snow', 'sun', 'moon', 'wave', 'tree', 'leaf', 'seed', 'bloom',
            'king', 'queen', 'hero', 'rebel', 'ninja', 'magic', 'dream', 'soul', 'heart', 'mind',
            'smith', 'jones', 'brown', 'davis', 'wilson', 'moore', 'white', 'lewis', 'walker', 'hall',
            'young', 'allen', 'green', 'adams', 'baker', 'clark', 'hill', 'scott', 'ward', 'cruz'
        ];
        
        this.randomWords = [
            'gamer', 'player', 'user', 'friend', 'buddy', 'pal', 'mate', 'dude', 'guy', 'girl',
            'nerd', 'geek', 'pro', 'noob', 'newbie', 'veteran', 'master', 'legend', 'boss', 'chief',
            'crazy', 'wild', 'random', 'funny', 'weird', 'strange', 'cool', 'awesome', 'epic', 'sick',
            'lost', 'found', 'free', 'solo', 'lone', 'single', 'double', 'triple', 'mega', 'ultra',
            'real', 'fake', 'true', 'false', 'old', 'new', 'young', 'fresh', 'classic', 'modern'
        ];
        
        this.suffixes = [
            '123', '456', '789', '101', '202', '303', '404', '505', '606', '707', '808', '909',
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '99', '88', '77', '66', '55',
            'x', 'xx', 'xxx', 'z', 'zz', 'zzz', 'xo', 'ox', 'lol', 'omg', 'wtf', 'gg', 'ez'
        ];
        
        this.chatMessages = [
            "hey everyone!",
            "what's up?",
            "anyone here from California?",
            "good morning all",
            "how's everyone's day going?",
            "nice to see some familiar faces",
            "quiet in here today",
            "love this room",
            "anyone watching the game tonight?",
            "coffee anyone? ☕",
            "working from home today",
            "beautiful weather outside",
            "weekend plans anyone?",
            "just got back from vacation",
            "anyone into music?",
            "what's everyone up to?",
            "new here, seems cool",
            "been here a while, great community",
            "anyone play video games?",
            "cooking dinner later",
            "just finished work",
            "long day today",
            "excited for the weekend",
            "anyone seen any good movies lately?",
            "thinking about ordering pizza",
            "traffic was terrible today",
            "working late tonight",
            "can't wait for summer",
            "spring is finally here",
            "love this time of year",
            "just woke up",
            "having lunch break",
            "Netflix recommendations?",
            "anyone else working weekends?",
            "gorgeous sunset today",
            "need more caffeine",
            "finally Friday!",
            "anyone from the east coast?",
            "homework is killing me",
            "can't believe it's Monday already",
            "this weather is crazy",
            "anyone else stressed lately?",
            "pets are being adorable today",
            "grocery shopping is exhausting",
            "technology confuses me sometimes",
            "miss traveling so much",
            "workout motivation needed",
            "cooking show marathon",
            "anyone else love rainy days?",
            "planning my next vacation",
            "can't find my keys again"
        ];
        
        this.responses = [
            "lol",
            "yeah totally",
            "same here",
            "nice",
            "cool",
            "agreed",
            "definitely",
            "haha",
            "for real",
            "yep",
            "true that",
            "right?",
            "exactly",
            "no way",
            "awesome",
            "sweet",
            "nice one",
            "oh wow",
            "that's crazy",
            "interesting",
            "makes sense",
            "good point",
            "i hear ya",
            "tell me about it",
            "been there",
            "so true",
            "love it",
            "that's funny",
            "omg yes",
            "seriously?",
            "no kidding",
            "sounds good",
            "count me in",
            "same boat",
            "totally get it",
            "mood",
            "facts",
            "this ^^",
            "couldn't agree more",
            "story of my life",
            "ain't that the truth",
            "preach",
            "you said it",
            "100%",
            "absolutely",
            "my thoughts exactly"
        ];
    }

    /**
     * Start the bot system
     */
    async startBots(options = {}) {
        if (this.isRunning) {
            logger.warn('Bot system is already running');
            return { success: false, message: 'Bot system is already running' };
        }

        // Validate and set defaults from BOT_CONFIG
        const config = this.validateBotConfig(options);
        this.currentConfig = config;

        try {
            logger.info('Starting bot system', config);
            
            // Create bots based on distribution mode
            await this.createBots(config);
            
            // Start bot activities
            this.startChatting(config.chatFrequencyMs);
            
            // Only start room movement if not in single room mode
            if (config.distributionMode !== BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM) {
                this.startMoving(config.moveFrequencyMs);
            }
            
            this.isRunning = true;
            
            logger.info('Bot system started successfully', { 
                activeBots: this.bots.size,
                distributionMode: config.distributionMode,
                targetRoomId: config.targetRoomId,
                chatFrequency: config.chatFrequencyMs,
                moveFrequency: config.moveFrequencyMs
            });
            
            return { 
                success: true, 
                message: `Started ${this.bots.size} bots successfully`,
                botCount: this.bots.size,
                config: config
            };
            
        } catch (error) {
            logger.error('Failed to start bot system', error);
            await this.stopBots(); // Cleanup on failure
            return { success: false, message: `Failed to start bots: ${error.message}` };
        }
    }

    /**
     * Validate and normalize bot configuration
     */
    validateBotConfig(options) {
        const {
            botCount = BOT_CONFIG.DEFAULT_BOT_COUNT,
            chatFrequencyMs = BOT_CONFIG.DEFAULT_CHAT_FREQUENCY_MS,
            moveFrequencyMs = BOT_CONFIG.DEFAULT_MOVE_FREQUENCY_MS,
            targetRoomId = null,
            distributionMode = null,
            roomIds = null // Array of specific room IDs to use
        } = options;

        // Validate bot count
        const validBotCount = Math.max(1, Math.min(botCount, BOT_CONFIG.MAX_BOT_COUNT));
        
        // Validate chat frequency
        const validChatFreq = Math.max(
            BOT_CONFIG.MIN_CHAT_FREQUENCY_MS, 
            Math.min(chatFrequencyMs, BOT_CONFIG.MAX_CHAT_FREQUENCY_MS)
        );
        
        // Validate move frequency
        const validMoveFreq = Math.max(
            BOT_CONFIG.MIN_MOVE_FREQUENCY_MS, 
            Math.min(moveFrequencyMs, BOT_CONFIG.MAX_MOVE_FREQUENCY_MS)
        );

        // Determine distribution mode
        let finalDistributionMode = distributionMode;
        let finalTargetRoomId = targetRoomId;
        let finalRoomIds = roomIds;

        if (targetRoomId) {
            finalDistributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
            finalRoomIds = [targetRoomId];
        } else if (roomIds && Array.isArray(roomIds) && roomIds.length > 0) {
            finalDistributionMode = roomIds.length === 1 
                ? BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM 
                : BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED;
            finalTargetRoomId = roomIds.length === 1 ? roomIds[0] : null;
        } else {
            finalDistributionMode = finalDistributionMode || BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM;
        }

        return {
            botCount: validBotCount,
            chatFrequencyMs: validChatFreq,
            moveFrequencyMs: validMoveFreq,
            targetRoomId: finalTargetRoomId,
            roomIds: finalRoomIds,
            distributionMode: finalDistributionMode
        };
    }

    /**
     * Stop all bots
     */
    async stopBots() {
        if (!this.isRunning) {
            return { success: false, message: 'Bot system is not running' };
        }

        try {
            const initialBotCount = this.bots.size;
            logger.info('Stopping bot system', { activeBots: initialBotCount });
            
            // Stop intervals first
            if (this.chatInterval) {
                clearInterval(this.chatInterval);
                this.chatInterval = null;
            }
            
            if (this.moveInterval) {
                clearInterval(this.moveInterval);
                this.moveInterval = null;
            }
            
            // Process bots in batches for better performance with large numbers
            const botArray = Array.from(this.bots.values());
            const batchSize = 100;
            let processedCount = 0;
            
            for (let i = 0; i < botArray.length; i += batchSize) {
                const batch = botArray.slice(i, i + batchSize);
                
                for (const bot of batch) {
                    try {
                        // Leave current room if in one
                        if (bot.currentRoomId) {
                            const room = serverState.getRoom(bot.currentRoomId);
                            if (room && room.hasUser(bot.uid)) {
                                room.removeUser({ uid: bot.uid });
                                
                                // Send disconnect notification to real users in the room
                                this.sendBotDisconnectNotification(room, bot);
                            }
                        }
                        
                        // Remove from server state
                        serverState.users.delete(bot.uid);
                        processedCount++;
                        
                    } catch (error) {
                        logger.warn('Error cleaning up bot', { 
                            botUid: bot.uid, 
                            botNickname: bot.nickname, 
                            error: error.message 
                        });
                    }
                }
                
                // Small delay between batches to prevent overwhelming the system
                if (i + batchSize < botArray.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            // Clear all bots and mark system as stopped
            this.bots.clear();
            this.isRunning = false;
            this.currentConfig = null;
            
            logger.info('Bot system stopped successfully', { 
                initialBotCount, 
                processedCount,
                remainingBots: this.bots.size 
            });
            
            return { 
                success: true, 
                message: `Successfully stopped ${processedCount} bots`,
                stoppedCount: processedCount
            };
            
        } catch (error) {
            logger.error('Error stopping bots', error);
            // Force cleanup even if there were errors
            this.bots.clear();
            this.isRunning = false;
            this.currentConfig = null;
            return { success: false, message: `Error stopping bots: ${error.message}` };
        }
    }

    /**
     * Create the specified number of bots
     */
    async createBots(config) {
        const { botCount, distributionMode, targetRoomId, roomIds } = config;
        
        logger.info('Creating bots', { 
            botCount, 
            distributionMode, 
            targetRoomId, 
            roomIds: roomIds?.length || 0 
        });
        
        let availableRooms = [];
        
        switch (distributionMode) {
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM:
                availableRooms = await this.getSingleTargetRoom(targetRoomId || roomIds[0]);
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED:
                availableRooms = await this.getSpecificRooms(roomIds);
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED:
                availableRooms = await this.getBalancedRooms();
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM:
            default:
                availableRooms = await this.getAllPublicRooms();
                break;
        }

        if (availableRooms.length === 0) {
            throw new Error('No available rooms for bots to join');
        }

        logger.info('Room distribution setup', { 
            mode: distributionMode,
            availableRoomsCount: availableRooms.length,
            roomNames: availableRooms.map(r => r.name).slice(0, 5) // Log first 5 room names
        });

        // Create bots with controlled room distribution and batch processing for large numbers
        const batchSize = 50; // Process bots in batches to avoid overwhelming the server
        let createdCount = 0;
        
        for (let i = 0; i < botCount; i += batchSize) {
            const currentBatchSize = Math.min(batchSize, botCount - i);
            const batchPromises = [];
            
            // Create batch of bots concurrently
            for (let j = 0; j < currentBatchSize; j++) {
                const botIndex = i + j;
                batchPromises.push(this.createSingleBot(botIndex, availableRooms, distributionMode));
            }
            
            try {
                // Wait for current batch to complete
                const bots = await Promise.all(batchPromises);
                
                // Add all bots from this batch to the collection
                bots.forEach(bot => {
                    if (bot) {
                        this.bots.set(bot.uid, bot);
                        createdCount++;
                    }
                });
                
                // Small delay between batches to prevent overwhelming the server
                if (i + batchSize < botCount) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                // Log progress for large numbers
                if (botCount > 100 && (i + batchSize) % 500 === 0) {
                    logger.info('Bot creation progress', { 
                        created: createdCount, 
                        total: botCount, 
                        percentage: Math.round((createdCount / botCount) * 100) 
                    });
                }
                
            } catch (error) {
                logger.warn('Failed to create bot batch', { 
                    batchStart: i, 
                    batchSize: currentBatchSize, 
                    error: error.message 
                });
            }
        }
        
        logger.info('Bot creation completed', { 
            requested: botCount, 
            created: createdCount, 
            successRate: Math.round((createdCount / botCount) * 100) + '%'
        });
        
        // Log final distribution
        this.logBotDistribution();
    }

    /**
     * Get a single target room for all bots
     */
    async getSingleTargetRoom(roomId) {
        const targetRoom = serverState.getRoom(roomId);
        
        if (!targetRoom) {
            throw new Error(`Target room ${roomId} not found`);
        }
        if (targetRoom.isPrivate) {
            throw new Error(`Cannot add bots to private room ${targetRoom.name}`);
        }
        
        logger.info('Using single target room for all bots', { 
            roomId: targetRoom.id, 
            roomName: targetRoom.name 
        });
        
        return [targetRoom];
    }

    /**
     * Get specific rooms by IDs
     */
    async getSpecificRooms(roomIds) {
        const rooms = [];
        
        for (const roomId of roomIds) {
            const room = serverState.getRoom(roomId);
            if (room && !room.isPrivate) {
                rooms.push(room);
            } else {
                logger.warn('Skipping unavailable room', { roomId, exists: !!room, isPrivate: room?.isPrivate });
            }
        }
        
        if (rooms.length === 0) {
            throw new Error('None of the specified rooms are available');
        }
        
        return rooms;
    }

    /**
     * Get rooms for balanced distribution
     */
    async getBalancedRooms() {
        const allRooms = serverState.getAllRooms().filter(room => !room.isPrivate);
        
        // Sort by user count (ascending) to prefer less populated rooms
        return allRooms.sort((a, b) => a.getUserCount() - b.getUserCount());
    }

    /**
     * Get all public rooms for random distribution
     */
    async getAllPublicRooms() {
        return serverState.getAllRooms().filter(room => !room.isPrivate);
    }

    /**
     * Log current bot distribution across rooms
     */
    logBotDistribution() {
        const distribution = new Map();
        
        for (const bot of this.bots.values()) {
            if (bot.currentRoomId) {
                const room = serverState.getRoom(bot.currentRoomId);
                const roomName = room ? room.name : `Unknown (${bot.currentRoomId})`;
                const count = distribution.get(roomName) || 0;
                distribution.set(roomName, count + 1);
            }
        }
        
        logger.info('Bot distribution summary', {
            totalBots: this.bots.size,
            distribution: Object.fromEntries(distribution)
        });
    }

    /**
     * Create a single bot
     */
    async createSingleBot(index, availableRooms, distributionMode) {
        // Generate a random, natural bot name
        const botName = this.generateBotName();
        const botUid = BOT_CONFIG.BOT_UID_START + index; // Use configured starting UID
        
        // Select room based on distribution mode
        let room;
        switch (distributionMode) {
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM:
                room = availableRooms[0]; // Always use the first (and only) room
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED:
                // Choose the room with the fewest bots currently
                room = this.selectLeastPopulatedRoom(availableRooms);
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED:
                // Distribute across specified rooms with some randomness
                room = availableRooms[index % availableRooms.length];
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM:
            default:
                room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
                break;
        }
        
        // Check if room has too many bots already
        const currentBotCount = this.getBotsInRoom(room.id);
        if (currentBotCount >= BOT_CONFIG.MAX_BOTS_PER_ROOM) {
            // Find alternative room or create anyway (log warning)
            const alternativeRoom = this.findAlternativeRoom(availableRooms, room.id);
            if (alternativeRoom) {
                logger.info('Room at bot capacity, using alternative', {
                    originalRoom: room.name,
                    alternativeRoom: alternativeRoom.name,
                    currentBotCount
                });
                room = alternativeRoom;
            } else {
                logger.warn('All rooms at bot capacity, adding anyway', {
                    roomName: room.name,
                    currentBotCount
                });
            }
        }
        
        const bot = {
            uid: botUid,
            nickname: botName,
            mode: USER_MODES.ONLINE,
            currentRoomId: room.id,
            isBot: true,
            createdAt: Date.now(),
            lastChatTime: 0,
            lastMoveTime: Date.now(),
            chatPersonality: this.assignBotPersonality(), // More sophisticated personality assignment
            statusColor: this.assignBotStatusColor(), // Assign display color for room list
            distributionMode: distributionMode
        };

        // Add bot to server state as an online user (without socket)
        const botUserData = new User({
            uid: bot.uid,
            nickname: bot.nickname,
            email: `bot${bot.uid}@paltalk.local`,
            first: 'Bot',
            last: 'User',
            admin: 0,
            created: Date.now(),
            last_login: Date.now(),
            listed: 0, // Don't show bots in user search
            verified: 1
        });
        
        // Set bot-specific properties
        botUserData.mode = USER_MODES.ONLINE;
        botUserData.socket = null; // Bots don't have real sockets
        botUserData.isBot = true;
        botUserData.statusColor = bot.statusColor; // Set the room list display color
        
        serverState.users.set(bot.uid, botUserData);
        
        // Add bot to the room
        if (!room.addUser(botUserData, true, false)) { // visible, not admin
            throw new Error(`Failed to add bot ${botName} to room ${room.name}`);
        }

        logger.debug('Created bot', {
            uid: bot.uid,
            nickname: bot.nickname,
            roomId: room.id,
            roomName: room.name
        });

        return bot;
    }

    /**
     * Select the room with the least number of bots for balanced distribution
     */
    selectLeastPopulatedRoom(availableRooms) {
        let selectedRoom = availableRooms[0];
        let minBotCount = this.getBotsInRoom(selectedRoom.id);
        
        for (const room of availableRooms) {
            const botCount = this.getBotsInRoom(room.id);
            if (botCount < minBotCount) {
                minBotCount = botCount;
                selectedRoom = room;
            }
        }
        
        return selectedRoom;
    }

    /**
     * Get the number of bots currently in a specific room
     */
    getBotsInRoom(roomId) {
        return Array.from(this.bots.values()).filter(bot => bot.currentRoomId === roomId).length;
    }

    /**
     * Find an alternative room that's not at bot capacity
     */
    findAlternativeRoom(availableRooms, excludeRoomId) {
        for (const room of availableRooms) {
            if (room.id !== excludeRoomId && this.getBotsInRoom(room.id) < BOT_CONFIG.MAX_BOTS_PER_ROOM) {
                return room;
            }
        }
        return null;
    }

    /**
     * Select a bot to chat based on personality weights
     */
    selectBotByPersonality(activeBots) {
        if (activeBots.length === 0) return null;
        
        // Weight bots by their personality tendency to chat
        const weightedBots = [];
        activeBots.forEach(bot => {
            let weight = 1;
            switch (bot.chatPersonality) {
                case 'chatty': weight = 3; break;
                case 'social': weight = 2.5; break;
                case 'friendly': weight = 2; break;
                case 'casual': weight = 1.5; break;
                case 'responsive': weight = 1; break;
                case 'lurker': weight = 0.3; break;
                default: weight = 1; break;
            }
            
            // Add multiple entries based on weight
            for (let i = 0; i < Math.ceil(weight * 10); i++) {
                weightedBots.push(bot);
            }
        });
        
        return weightedBots[Math.floor(Math.random() * weightedBots.length)];
    }

    /**
     * Get minimum chat interval based on personality
     */
    getMinChatInterval(personality) {
        const baseInterval = 90000; // 1.5 minutes base
        const randomFactor = Math.random() * 60000; // 0-1 minute random
        
        switch (personality) {
            case 'chatty': return baseInterval * 0.5 + randomFactor; // 45s - 1m 45s
            case 'social': return baseInterval * 0.7 + randomFactor; // 1m 3s - 2m 3s
            case 'friendly': return baseInterval * 0.8 + randomFactor; // 1m 12s - 2m 12s
            case 'casual': return baseInterval * 1.0 + randomFactor; // 1m 30s - 2m 30s
            case 'responsive': return baseInterval * 1.5 + randomFactor; // 2m 15s - 3m 15s
            case 'lurker': return baseInterval * 3.0 + randomFactor; // 4m 30s - 5m 30s
            default: return baseInterval + randomFactor;
        }
    }

    /**
     * Get personality-based chat probability bonus
     */
    getPersonalityChatBonus(personality, userCount, recentMessageCount) {
        let bonus = 0.5; // base 50% chance
        
        switch (personality) {
            case 'chatty':
                bonus = 0.8; // Always eager to chat
                break;
            case 'social':
                bonus = userCount > 2 ? 0.7 : 0.4; // Loves crowds
                break;
            case 'friendly':
                bonus = 0.6; // Consistently friendly
                break;
            case 'casual':
                bonus = recentMessageCount < 2 ? 0.6 : 0.3; // Prefers quieter moments
                break;
            case 'responsive':
                bonus = recentMessageCount > 0 ? 0.7 : 0.2; // Responds to activity
                break;
            case 'lurker':
                bonus = 0.1; // Rarely speaks
                break;
        }
        
        return bonus;
    }

    /**
     * Generate a random, natural bot name that real users would use
     */
    generateBotName() {
        const patterns = [
            // firstname + number
            () => {
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                const num = Math.floor(Math.random() * 9999) + 1;
                return `${first}${num}`;
            },
            // firstname + lastname
            () => {
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                const last = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
                return `${first}_${last}`;
            },
            // firstname + word + number
            () => {
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                const word = this.randomWords[Math.floor(Math.random() * this.randomWords.length)];
                const num = Math.floor(Math.random() * 99) + 1;
                return `${first}_${word}${num}`;
            },
            // word + firstname
            () => {
                const word = this.randomWords[Math.floor(Math.random() * this.randomWords.length)];
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                return `${word}_${first}`;
            },
            // firstname + suffix
            () => {
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                const suffix = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
                return `${first}_${suffix}`;
            },
            // two words + number
            () => {
                const word1 = this.randomWords[Math.floor(Math.random() * this.randomWords.length)];
                const word2 = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
                const num = Math.floor(Math.random() * 999) + 1;
                return `${word1}${word2}${num}`;
            },
            // just firstname (sometimes)
            () => {
                const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
                return first;
            },
            // word + number
            () => {
                const word = this.randomWords[Math.floor(Math.random() * this.randomWords.length)];
                const num = Math.floor(Math.random() * 9999) + 1;
                return `${word}${num}`;
            }
        ];
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        return pattern();
    }

    /**
     * Assign a status color to a bot for room list display
     * Most bots are black (regular), some green (premium), few blue (special)
     */
    assignBotStatusColor() {
        const random = Math.random();
        if (random < 0.80) {
            return BOT_CONFIG.STATUS_COLORS.BLACK; // 80% black (regular users)
        } else if (random < 0.95) {
            return BOT_CONFIG.STATUS_COLORS.GREEN; // 15% green (premium/online)
        } else {
            return BOT_CONFIG.STATUS_COLORS.BLUE; // 5% blue (special status)
        }
    }

    /**
     * Assign a personality type to a bot for more varied behavior
     */
    assignBotPersonality() {
        const personalities = [
            'chatty',      // Initiates conversations frequently
            'responsive',  // Mainly responds to others
            'lurker',      // Rarely talks, mostly observes
            'social',      // Asks questions and engages
            'casual',      // Makes light, casual comments
            'friendly'     // Welcoming and positive
        ];
        
        // Weighted distribution - more responsive and casual bots for realism
        const weights = [15, 30, 10, 20, 20, 5]; // percentages
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (let i = 0; i < personalities.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return personalities[i];
            }
        }
        
        return 'responsive'; // fallback
    }

    /**
     * Get current bot configuration
     */
    getBotConfig() {
        return this.currentConfig;
    }

    /**
     * Get bot statistics by room
     */
    getBotStats() {
        const stats = {
            totalBots: this.bots.size,
            isRunning: this.isRunning,
            config: this.currentConfig,
            roomDistribution: new Map(),
            botDetails: []
        };

        for (const bot of this.bots.values()) {
            if (bot.currentRoomId) {
                const room = serverState.getRoom(bot.currentRoomId);
                const roomName = room ? room.name : `Unknown (${bot.currentRoomId})`;
                const count = stats.roomDistribution.get(roomName) || 0;
                stats.roomDistribution.set(roomName, count + 1);
                
                stats.botDetails.push({
                    uid: bot.uid,
                    nickname: bot.nickname,
                    roomId: bot.currentRoomId,
                    roomName: roomName,
                    chatPersonality: bot.chatPersonality,
                    statusColor: bot.statusColor,
                    createdAt: bot.createdAt
                });
            }
        }

        return stats;
    }

    /**
     * Start random chatting
     */
    startChatting(frequencyMs) {
        this.chatInterval = setInterval(() => {
            this.performRandomChat();
        }, frequencyMs);
    }

    /**
     * Start random room movement
     */
    startMoving(frequencyMs) {
        this.moveInterval = setInterval(() => {
            this.performRandomMovement();
        }, frequencyMs);
    }

    /**
     * Make random bots chat - Much more realistic timing and behavior
     */
    performRandomChat() {
        if (this.bots.size === 0) return;

        const activeBots = Array.from(this.bots.values()).filter(bot => bot.currentRoomId);
        if (activeBots.length === 0) return;

        // Only 1 bot talks at a time, and not every interval
        // Adjust probability based on total bot count to prevent spam
        const baseChatProbability = Math.min(0.4, 0.1 + (0.3 / Math.max(1, activeBots.length / 5)));
        if (Math.random() > baseChatProbability) return;

        // Select a bot based on personality weights
        const chattingBot = this.selectBotByPersonality(activeBots);
        if (!chattingBot) return;
        
        // Check if this bot has chatted recently (prevent spam)
        const timeSinceLastChat = Date.now() - chattingBot.lastChatTime;
        const minTimeBetweenChats = this.getMinChatInterval(chattingBot.chatPersonality);
        
        if (timeSinceLastChat < minTimeBetweenChats) return;

        // Check room activity level to adjust chat probability
        const room = serverState.getRoom(chattingBot.currentRoomId);
        if (!room) return;

        const recentMessages = this.getRecentRoomMessages(room.id);
        const roomUsers = room.getAllUsers().filter(u => !serverState.getUser(u.uid)?.isBot); // Count real users only
        
        // Less likely to chat if no real users or if there's been a lot of recent activity
        if (roomUsers.length === 0) return;
        if (recentMessages.length > 3 && Math.random() > 0.2) return; // Back off if room is busy

        // Personality-based chat probability adjustments
        const personalityBonus = this.getPersonalityChatBonus(chattingBot.chatPersonality, roomUsers.length, recentMessages.length);
        if (Math.random() > personalityBonus) return;

        this.makeBotChat(chattingBot);
    }

    /**
     * Determine if bot should respond based on personality
     */
    shouldRespond(personality, recentMessageCount) {
        switch (personality) {
            case 'responsive': return recentMessageCount > 0 && Math.random() > 0.3;
            case 'social': return recentMessageCount > 0 && Math.random() > 0.4;
            case 'friendly': return recentMessageCount > 0 && Math.random() > 0.5;
            case 'chatty': return Math.random() > 0.7; // Sometimes responds, mostly initiates
            case 'casual': return recentMessageCount > 0 && Math.random() > 0.6;
            case 'lurker': return recentMessageCount > 2 && Math.random() > 0.8; // Rarely responds
            default: return recentMessageCount > 0 && Math.random() > 0.5;
        }
    }

    /**
     * Get personality-appropriate response message
     */
    getPersonalityResponse(personality) {
        let responsePool = [...this.responses];
        
        switch (personality) {
            case 'chatty':
                responsePool.push("tell me more!", "that's interesting", "oh really?", "go on...");
                break;
            case 'social':
                responsePool.push("anyone else agree?", "what do you all think?", "same here!");
                break;
            case 'friendly':
                responsePool.push("that's nice :)", "sounds good!", "awesome!", "love it!");
                break;
            case 'casual':
                responsePool = responsePool.filter(r => r.length <= 10); // Shorter responses
                break;
            case 'lurker':
                responsePool = ["yeah", "ok", "true", "yep", "mhm"]; // Very minimal
                break;
        }
        
        return responsePool[Math.floor(Math.random() * responsePool.length)];
    }

    /**
     * Get personality-appropriate initial message
     */
    getPersonalityMessage(personality, currentHour, isWeekend, userCount) {
        let contextualMessages = [...this.chatMessages];
        
        // Add time-specific messages
        if (currentHour >= 6 && currentHour < 12) {
            contextualMessages.push("good morning everyone", "morning coffee time", "early bird here", "ready to start the day");
        } else if (currentHour >= 12 && currentHour < 17) {
            contextualMessages.push("afternoon all", "lunch break anyone?", "middle of the day already", "how's the afternoon treating you?");
        } else if (currentHour >= 17 && currentHour < 22) {
            contextualMessages.push("evening everyone", "dinner time soon", "end of the workday", "good evening all");
        } else {
            contextualMessages.push("night owls unite", "late night crew", "can't sleep either?", "burning the midnight oil");
        }
        
        // Add weekend-specific messages
        if (isWeekend) {
            contextualMessages.push("loving this weekend", "weekend vibes", "no work today!", "weekend plans anyone?", "sleeping in was great");
        } else {
            contextualMessages.push("how's work going?", "another weekday", "looking forward to the weekend", "busy day today");
        }
        
        // Add room population context
        if (userCount === 1) {
            contextualMessages.push("nice and quiet in here", "peaceful today", "enjoying the solitude");
        } else if (userCount > 5) {
            contextualMessages.push("busy room today", "lots of people here", "lively crowd tonight");
        }
        
        // Personality-specific message filtering and additions
        switch (personality) {
            case 'chatty':
                contextualMessages.push("so what's everyone up to?", "tell me about your day", "anyone have exciting plans?", "what's new with everyone?");
                break;
            case 'social':
                contextualMessages.push("anyone else here from the west coast?", "what does everyone do for work?", "how's everyone's week going?", "anyone have weekend plans?");
                break;
            case 'friendly':
                contextualMessages.push("hope everyone's having a great day!", "sending good vibes to all", "you're all awesome!", "happy to be here with you all");
                break;
            case 'casual':
                // Prefer shorter, more casual messages
                contextualMessages = contextualMessages.filter(msg => msg.length <= 30);
                break;
            case 'lurker':
                // Very minimal messages
                contextualMessages = ["hey", "hi all", "what's up", "afternoon", "evening"];
                break;
        }
        
        return contextualMessages[Math.floor(Math.random() * contextualMessages.length)];
    }

    /**
     * Make a specific bot send a chat message
     */
    makeBotChat(bot) {
        const room = serverState.getRoom(bot.currentRoomId);
        if (!room) return;

        // Get current time for time-based messages
        const currentHour = new Date().getHours();
        const isWeekend = [0, 6].includes(new Date().getDay());
        
        // Choose message type based on personality, recent activity, and context
        let message;
        const recentMessages = this.getRecentRoomMessages(room.id);
        const roomUsers = room.getAllUsers().filter(u => !serverState.getUser(u.uid)?.isBot);
        
        // More sophisticated message selection based on personality
        if (recentMessages.length > 0 && this.shouldRespond(bot.chatPersonality, recentMessages.length)) {
            // Respond to recent messages with varied responses
            message = this.getPersonalityResponse(bot.chatPersonality);
        } else {
            // Select contextual messages based on time, day, and personality
            message = this.getPersonalityMessage(bot.chatPersonality, currentHour, isWeekend, roomUsers.length);
        }

        // Occasionally add some variety with emojis or casual typos for realism
        if (Math.random() > 0.9) {
            const variations = [
                message + " 😊",
                message + " :)",
                message + " lol",
                message + "!",
                message.replace(/o/g, 'oo'), // occasional "sooo" instead of "so"
                message + "..."
            ];
            message = variations[Math.floor(Math.random() * variations.length)];
        }

        // Simulate the bot sending a message by broadcasting to the room
        try {
            const roomIdHex = Utils.decToHex(room.id);
            const senderIdHex = Utils.decToHex(bot.uid);
            const messageHex = Buffer.from(message, 'utf8').toString('hex');
            
            const combinedHex = roomIdHex + senderIdHex + messageHex;
            const messageBuffer = Buffer.from(combinedHex, 'hex');

            // Broadcast to all real users in the room (exclude other bots to avoid spam)
            room.getAllUsers().forEach(roomUserData => {
                const user = serverState.getUser(roomUserData.uid);
                if (user && user.socket && !user.isBot) {
                    try {
                        const { sendPacket } = require('../network/packetSender');
                        const { PACKET_TYPES } = require('../../PacketHeaders');
                        sendPacket(user.socket, PACKET_TYPES.ROOM_MESSAGE_IN, messageBuffer, user.socket.id);
                    } catch (error) {
                        logger.warn('Failed to send bot message to user', { 
                            botUid: bot.uid, 
                            userUid: user.uid,
                            error: error.message 
                        });
                    }
                }
            });

            bot.lastChatTime = Date.now();
            
            logger.debug('Bot sent message', {
                botUid: bot.uid,
                botNickname: bot.nickname,
                roomId: room.id,
                roomName: room.name,
                message: message.substring(0, 50),
                personality: bot.chatPersonality,
                timeContext: currentHour >= 6 && currentHour < 12 ? 'morning' : 
                           currentHour >= 12 && currentHour < 17 ? 'afternoon' : 
                           currentHour >= 17 && currentHour < 22 ? 'evening' : 'night'
            });

        } catch (error) {
            logger.warn('Failed to make bot chat', { 
                botUid: bot.uid, 
                roomId: room.id,
                error: error.message 
            });
        }
    }

    /**
     * Move random bots to different rooms
     */
    performRandomMovement() {
        if (this.bots.size === 0) return;

        const availableRooms = serverState.getAllRooms().filter(room => !room.isPrivate);
        if (availableRooms.length <= 1) return;

        // Move 10-20% of bots
        const botsToMove = Math.floor(this.bots.size * (0.1 + Math.random() * 0.1));
        const botArray = Array.from(this.bots.values());
        const shuffledBots = botArray.sort(() => Math.random() - 0.5);
        const movingBots = shuffledBots.slice(0, botsToMove);

        movingBots.forEach(bot => {
            this.moveBotToRandomRoom(bot, availableRooms);
        });
    }

    /**
     * Move a bot to a random room
     */
    moveBotToRandomRoom(bot, availableRooms) {
        const currentRoom = serverState.getRoom(bot.currentRoomId);
        const newRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
        
        if (!newRoom || newRoom.id === bot.currentRoomId) return;

        try {
            // Leave current room
            if (currentRoom && currentRoom.hasUser(bot.uid)) {
                currentRoom.removeUser({ uid: bot.uid });
            }

            // Join new room
            const botUserData = serverState.getUser(bot.uid);
            if (botUserData && newRoom.addUser(botUserData, true, false)) {
                bot.currentRoomId = newRoom.id;
                bot.lastMoveTime = Date.now();
                
                logger.debug('Bot moved rooms', {
                    botUid: bot.uid,
                    botNickname: bot.nickname,
                    fromRoom: currentRoom ? currentRoom.name : 'none',
                    toRoom: newRoom.name
                });
            }

        } catch (error) {
            logger.warn('Failed to move bot', { 
                botUid: bot.uid, 
                fromRoomId: bot.currentRoomId,
                toRoomId: newRoom.id,
                error: error.message 
            });
        }
    }

    /**
     * Send disconnect notification to real users when a bot leaves
     */
    sendBotDisconnectNotification(room, bot) {
        try {
            // Send user left notification to all real users in the room
            const userLeftBuffer = Buffer.from([
                ...Utils.decToHex(room.id, 4),
                ...Utils.decToHex(bot.uid, 4)
            ].join(''), 'hex');

            room.getAllUsers().forEach(roomUserData => {
                const user = serverState.getUser(roomUserData.uid);
                if (user && user.socket && !user.isBot) {
                    try {
                        const { sendPacket } = require('../network/packetSender');
                        const { PACKET_TYPES } = require('../../PacketHeaders');
                        sendPacket(user.socket, PACKET_TYPES.USER_LEFT_ROOM, userLeftBuffer, user.socket.id);
                    } catch (error) {
                        logger.warn('Failed to send bot disconnect notification', { 
                            botUid: bot.uid, 
                            userUid: user.uid,
                            error: error.message 
                        });
                    }
                }
            });
        } catch (error) {
            logger.warn('Failed to send bot disconnect notifications', {
                botUid: bot.uid,
                roomId: room.id,
                error: error.message
            });
        }
    }

    /**
     * Get recent messages from a room (placeholder - would need message history)
     */
    getRecentRoomMessages(roomId) {
        // This would ideally look at recent message history
        // For now, return empty array
        return [];
    }

    /**
     * Get bot statistics
     */
    getBotStats() {
        const stats = {
            totalBots: this.bots.size,
            isRunning: this.isRunning,
            botsPerRoom: {},
            botPersonalities: {
                chatty: 0,
                responsive: 0
            }
        };

        // Count bots per room
        for (const bot of this.bots.values()) {
            if (bot.currentRoomId) {
                const room = serverState.getRoom(bot.currentRoomId);
                const roomName = room ? room.name : `Room ${bot.currentRoomId}`;
                stats.botsPerRoom[roomName] = (stats.botsPerRoom[roomName] || 0) + 1;
            }
            
            stats.botPersonalities[bot.chatPersonality]++;
        }

        return stats;
    }
}

module.exports = new BotManager();
