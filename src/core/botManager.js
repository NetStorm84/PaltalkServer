/**
 * Bot Manager - Creates and manages automated users (bots) for testing and ambiance
 */

const serverState = require('./serverState');
const logger = require('../utils/logger');
const { USER_MODES, BOT_CONFIG } = require('../config/constants');
const Utils = require('../utils/utils');
const User = require('../models/User');
const { sendPacket } = require('../network/packetSender');
const { PACKET_TYPES } = require('../../PacketHeaders');

class BotManager {
    constructor() {
        this.bots = new Map(); // botId -> bot data
        this.isRunning = false;
        this.chatInterval = null;
        this.moveInterval = null;
        this.currentConfig = null; // Store current bot configuration
        
        // Performance optimization: Track bots per room for O(1) lookups
        this.botsPerRoom = new Map(); // roomId -> count
        
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
            // Very short messages (1-3 words)
            "hey",
            "hi all",
            "what's up",
            "morning",
            "afternoon",
            "evening",
            "hello",
            "sup",
            "hey there",
            "good morning",
            "how's it going",
            "what's new",
            "hey everyone",
            "hi there",
            "wassup",
            
            // Short casual messages (4-10 words)
            "just got here, what did I miss?",
            "anyone around today?",
            "pretty quiet in here",
            "how's everyone doing?",
            "nice to see familiar faces",
            "coffee time for me",
            "just finished work finally",
            "weekend vibes anyone?",
            "Monday blues hitting hard",
            "beautiful day outside today",
            "rainy weather here",
            "traffic was terrible",
            "running late as usual",
            "need more coffee",
            "almost Friday thank god",
            
            // Medium length conversational messages (10-20 words)
            "hey everyone! hope you're all having a good day so far",
            "what's up? just finished my morning coffee and feeling human again",
            "anyone here from the west coast? thinking about visiting soon",
            "good morning all! the sun is finally shining here today",
            "how's everyone's week going? mine's been absolutely crazy busy",
            "nice to see some activity in here, was getting pretty quiet",
            "working from home today and my cat is being super distracting",
            "anyone watching anything good on Netflix lately? need recommendations",
            "thinking about ordering takeout because I'm too lazy to cook tonight",
            "finally got my weekend plans sorted, gonna be a good one",
            
            // Longer personal updates (20-40 words)
            "just got back from vacation and I'm already missing the beach, why does real life have to be so harsh? back to the grind tomorrow unfortunately",
            "anyone else feel like technology is moving too fast? I swear my phone gets a new update every other day and I have no idea what anything does anymore",
            "been working from home for months now and I honestly don't know if I ever want to go back to an office, this whole setup is pretty sweet",
            "grocery shopping today was an adventure, spent like 20 minutes in the cereal aisle because there are apparently 47 different types of cheerios now, when did that happen?",
            "my dog has been extra clingy today which is cute but also makes it impossible to get any work done, currently have a 60 pound lap dog situation happening",
            "trying to decide what to binge watch this weekend, any suggestions? I've already watched everything good on Netflix and I'm getting desperate here",
            
            // Very long detailed stories (40+ words)
            "so I had the weirdest experience at the grocery store today, I was in line behind this guy who was buying like 47 cans of cat food and nothing else, and when the cashier asked if he had a lot of cats he just said 'not yet' and walked away, I'm still thinking about what that could possibly mean",
            "anyone else have those days where you start with the best intentions and then by noon you're eating cereal for lunch while watching cooking shows? because that's exactly where I am right now and I'm not even sorry about it, sometimes you just have to embrace the chaos",
            "my neighbor has been playing the same song on repeat for like 3 hours now and I'm torn between being annoyed and being impressed by their dedication to whatever emotional journey they're going through, it's that one sad song from the 90s and honestly it's kind of a mood",
            "just spent 45 minutes looking for my keys only to find them in the refrigerator next to the milk, I have absolutely no memory of putting them there but apparently that's where I thought they belonged, adulthood is going really well for me right now as you can tell",
            "went for a walk today and saw this elderly couple holding hands and feeding ducks at the pond, they looked like they'd been doing it every day for 50 years and it was honestly the most beautiful thing I've seen all week, sometimes the simple moments are the best ones",
            "my coworker just told me she's been putting pineapple on pizza for her whole life and acting like it's normal, I don't know if we can continue working together after this revelation, this feels like a fundamental incompatibility that can't be overcome",
            
            // Random observations and thoughts
            "why do they call it rush hour when nobody's moving",
            "shower thoughts: if you're waiting for the waiter, aren't you the waiter?",
            "does anyone else get irrationally angry at slow internet? like it's 2025, my memes should load instantly",
            "conspiracy theory: grocery stores move everything around just to mess with us",
            "unpopular opinion: pineapple on pizza is actually fine and people need to calm down about it",
            "life hack: if you can't remember if you locked the door, you probably did but you'll check anyway",
            "random question: why do we park in driveways and drive on parkways? who designed this system?",
            "philosophical moment: are we all just NPCs in someone else's video game? discuss",
            "scientific fact: the 5 second rule for dropped food doesn't actually work but we all still use it",
            "universal truth: the moment you get comfortable, you'll need to use the bathroom",
            
            // Emotional/personal moments
            "having one of those days where everything feels overwhelming but I know it'll pass",
            "grateful for this little corner of the internet where people are actually nice to each other",
            "sometimes I miss being a kid when the biggest decision was which cartoon to watch",
            "adulting is hard but at least I can eat ice cream for dinner if I want to",
            "reminder to myself and everyone else: it's okay to have bad days, tomorrow is a fresh start",
            
            // Current events and observations (staying general)
            "the weather has been absolutely bonkers lately, can't tell if it's spring or winter",
            "gas prices are making me consider walking everywhere, might actually be healthier anyway",
            "saw someone using a flip phone today and honestly felt a little jealous of their simplicity",
            "the amount of streaming services now is getting ridiculous, I need a spreadsheet to track them all",
            "remember when we thought Y2K was going to end the world? good times, simpler problems"
        ];
        
        this.responses = [
            // Ultra short (1-2 words)
            "lol",
            "yep",
            "nah",
            "true",
            "same",
            "wow",
            "nice",
            "omg",
            "ikr",
            "mood",
            "facts",
            "this",
            "yes",
            "no",
            "maybe",
            "definitely",
            "absolutely",
            "totally",
            "exactly",
            "right?",
            
            // Short responses (3-6 words)
            "lol totally",
            "yeah absolutely",
            "same here honestly",
            "oh nice",
            "that's really cool",
            "I completely agree",
            "definitely feeling that",
            "haha exactly",
            "for real though",
            "yep same energy",
            "true that for sure",
            "right? it's so obvious",
            "no way really?",
            "that's awesome honestly",
            "oh wow that's sweet",
            "nice one I like it",
            "oh wow really?",
            "that's actually insane",
            "super interesting",
            "makes total sense",
            "been there before",
            "so true though",
            "love that energy",
            "that's genuinely funny",
            "wait seriously?",
            "couldn't agree more",
            
            // Medium responses (7-15 words)
            "that makes so much sense when you think about it",
            "okay that's actually a really good point you made",
            "I totally hear you on that one",
            "ugh tell me about it, I feel exactly the same way",
            "been there before, it's honestly the worst feeling",
            "so true, happens to me literally all the time",
            "love that energy honestly, we need more of that",
            "omg yes, finally someone who gets it completely",
            "no kidding, I was just thinking the exact same thing",
            "sounds really good actually, count me in for sure",
            "we're definitely in the same boat with that one",
            "I totally get what you mean by that",
            "that's such a mood honestly, felt that",
            "those are straight facts, no arguments here",
            "this is exactly what I needed to hear today",
            "literally the story of my life right there",
            "ain't that the truth though, so relatable",
            "you really said it perfectly, couldn't have put it better",
            "absolutely, that's so relatable it's not even funny",
            "my thoughts exactly, word for word what I was thinking",
            
            // Longer conversational responses (15-30 words)
            "100% agree with everything you just said, you really hit the nail on the head with that observation about life in general",
            "that's such a valid point and honestly something I never really thought about before, but now that you mention it, it makes perfect sense",
            "you're speaking my language here, finally someone who understands what I've been trying to explain to people for years, thank you for putting it into words",
            "that really resonates with me on a spiritual level, like you just described my entire existence in one sentence and I don't know how to feel about it",
            "you took the words right out of my mouth, that's exactly how I would have put it if I was smart enough to think of it first",
            "preach, someone had to say it and I'm glad it was you, this needed to be said and you did it perfectly",
            "that's honestly so true it hurts, like why did you have to call me out like that in front of everyone, I feel personally attacked but also validated",
            "I'm living for this take right here, this is the kind of wisdom I come to the internet for, keep dropping truth bombs like this",
            "you just described my entire existence in one paragraph and I don't know whether to laugh or cry about it, probably both honestly",
            "that's the realest thing I've heard all day and it's only noon, you're out here spitting facts and making the rest of us look bad",
            
            // Very long detailed responses (30+ words)
            "okay so this is going to sound weird but I was literally just thinking about this exact same thing yesterday when I was stuck in traffic for like an hour, and I came to the exact same conclusion you just did, which either means great minds think alike or we're both just overthinking everything, but honestly I'm okay with either option at this point",
            "I appreciate you sharing that perspective because it's actually something I've been struggling with lately and hearing someone else put it into words like that makes me feel less alone in thinking about it, sometimes you just need to know other people are having the same thoughts and experiences as you, you know?",
            "this reminds me of something my grandmother used to say about how life has a way of teaching you lessons when you least expect it, she was always dropping wisdom like that and I never really appreciated it until I got older and started experiencing these things for myself, funny how that works",
            "not to get too deep or anything but this really makes me think about how we're all just trying to figure things out as we go along and pretending like we have any idea what we're doing, like we're all just winging it and hoping for the best, which is both terrifying and somehow comforting at the same time",
            "I had a similar experience last week and it completely changed my perspective on things, sometimes you don't realize how much you needed to hear something until someone says it, and then suddenly everything clicks into place and you wonder how you never saw it that way before, it's like having a lightbulb moment but for your entire worldview"
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
                        // Get the actual user data from server state
                        const botUser = serverState.users.get(bot.uid);
                        
                        // Leave current room if in one
                        if (bot.currentRoomId) {
                            const room = serverState.getRoom(bot.currentRoomId);
                            if (room && room.hasUser(bot.uid)) {
                                // Send disconnect notification to real users BEFORE removing bot
                                this.sendBotDisconnectNotification(room, bot);
                                
                                // Now remove the bot from the room
                                room.removeUser(botUser || bot.uid);
                                
                                // Update room count cache
                                this.updateBotRoomCount(bot.currentRoomId, -1);
                            }
                        }
                        
                        // If botUser has currentRooms, clean those up too
                        if (botUser && botUser.currentRooms && botUser.currentRooms.size > 0) {
                            const roomIds = [...botUser.currentRooms]; // Copy to avoid modification during iteration
                            for (const roomId of roomIds) {
                                const room = serverState.getRoom(roomId);
                                if (room && room.hasUser(bot.uid)) {
                                    // Send disconnect notification BEFORE removing bot
                                    this.sendBotDisconnectNotification(room, bot);
                                    
                                    // Now remove the bot from the room
                                    room.removeUser(botUser);
                                }
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
            this.botsPerRoom.clear(); // Clear room count cache
            this.isRunning = false;
            this.currentConfig = null;
            
            // Double check for any remaining bot users in server state
            let remainingBots = 0;
            for (const user of serverState.users.values()) {
                if (user.uid >= BOT_CONFIG.BOT_UID_START) {
                    // Try to remove any remaining bot users
                    try {
                        if (user.currentRooms && user.currentRooms.size > 0) {
                            for (const roomId of user.currentRooms) {
                                const room = serverState.getRoom(roomId);
                                if (room) {
                                    // Pass the actual user object, not just UID
                                    room.removeUser(user);
                                }
                            }
                        }
                        serverState.users.delete(user.uid);
                        remainingBots++;
                    } catch (error) {
                        logger.warn('Error removing remaining bot user', { uid: user.uid, error: error.message });
                    }
                }
            }
            
            logger.info('Bot system stopped successfully', { 
                initialBotCount, 
                processedCount,
                remainingBotsRemoved: remainingBots,
                finalRemainingBots: this.bots.size 
            });
            
            return { 
                success: true, 
                message: `Successfully stopped ${processedCount + remainingBots} bots`,
                stoppedCount: processedCount + remainingBots
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

        // Optimized bot creation with intelligent batching and memory management
        const baseBatchSize = this.calculateOptimalBatchSize(botCount);
        let createdCount = 0;
        const startTime = Date.now();
        
        // Pre-allocate arrays for better memory performance
        const botPromises = [];
        const roomAssignments = this.preCalculateRoomAssignments(botCount, availableRooms, distributionMode);
        
        for (let i = 0; i < botCount; i += baseBatchSize) {
            const currentBatchSize = Math.min(baseBatchSize, botCount - i);
            const batchStartTime = Date.now();
            
            // Create batch of bots with optimized creation
            const batchPromises = [];
            for (let j = 0; j < currentBatchSize; j++) {
                const botIndex = i + j;
                const assignedRoom = roomAssignments[botIndex];
                batchPromises.push(this.createSingleBotOptimized(botIndex, assignedRoom, distributionMode));
            }
            
            try {
                // Wait for current batch to complete
                const bots = await Promise.allSettled(batchPromises);
                
                // Process results and collect successful bots
                const successfulBots = [];
                bots.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        successfulBots.push(result.value);
                        createdCount++;
                    } else if (result.status === 'rejected') {
                        logger.warn('Failed to create bot in batch', { 
                            botIndex: i + index, 
                            error: result.reason?.message || 'Unknown error' 
                        });
                    }
                });
                
                // Add successful bots to collection in one operation
                successfulBots.forEach(bot => {
                    this.bots.set(bot.uid, bot);
                    // Update room count cache
                    this.updateBotRoomCount(bot.currentRoomId, 1);
                });
                
                // Dynamic delay based on performance
                const batchTime = Date.now() - batchStartTime;
                if (i + baseBatchSize < botCount) {
                    const delay = this.calculateBatchDelay(batchTime, currentBatchSize);
                    if (delay > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                // Progress logging for large numbers
                if (botCount > 100 && (createdCount % 1000 === 0 || i + baseBatchSize >= botCount)) {
                    const elapsed = Date.now() - startTime;
                    const rate = createdCount / (elapsed / 1000);
                    logger.info('Bot creation progress', { 
                        created: createdCount, 
                        total: botCount, 
                        percentage: Math.round((createdCount / botCount) * 100),
                        rate: Math.round(rate * 10) / 10 + ' bots/sec',
                        elapsed: Math.round(elapsed / 1000) + 's'
                    });
                }
                
                // Memory cleanup for large batches
                if (botCount > 1000 && i % 1000 === 0) {
                    if (global.gc) {
                        global.gc();
                    }
                }
                
            } catch (error) {
                logger.error('Critical error in bot batch creation', { 
                    batchStart: i, 
                    batchSize: currentBatchSize, 
                    error: error.message,
                    stack: error.stack
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
            lastChatTime: Date.now() - 30000, // Set to 30 seconds ago so they can chat soon
            lastMoveTime: Date.now(),
            chatPersonality: this.assignBotPersonalityBalanced(room.id), // Balanced personality for better room distribution
            statusColor: this.assignBotStatusColor(), // Assign display color for room list
            textStyle: this.assignBotTextStyle(), // Assign consistent text formatting style
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
        botUserData.color = bot.statusColor; // Set the room list display color
        
        // Add basic room tracking methods for bots to ensure proper cleanup
        if (!botUserData.currentRooms) {
            botUserData.currentRooms = new Set();
        }
        
        // Implement removeFromRoom method if it doesn't exist
        if (typeof botUserData.removeFromRoom !== 'function') {
            botUserData.removeFromRoom = function(roomId) {
                if (this.currentRooms) {
                    this.currentRooms.delete(roomId);
                }
            };
        }
        
        // Implement addToRoom method if it doesn't exist
        if (typeof botUserData.addToRoom !== 'function') {
            botUserData.addToRoom = function(roomId) {
                if (this.currentRooms) {
                    this.currentRooms.add(roomId);
                }
            };
        }
        
        serverState.users.set(bot.uid, botUserData);
        
        // Add bot to the room
        if (!room.addUser(botUserData, true, false)) { // visible, not admin
            throw new Error(`Failed to add bot ${botName} to room ${room.name}`);
        }

        // Send join notification to real users in the room
        this.sendBotJoinNotification(room, bot);

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
     * Get the number of bots currently in a specific room (optimized with cache)
     */
    getBotsInRoom(roomId) {
        return this.botsPerRoom.get(roomId) || 0;
    }
    
    /**
     * Update bot room count cache
     */
    updateBotRoomCount(roomId, delta) {
        const current = this.botsPerRoom.get(roomId) || 0;
        const newCount = Math.max(0, current + delta);
        if (newCount === 0) {
            this.botsPerRoom.delete(roomId);
        } else {
            this.botsPerRoom.set(roomId, newCount);
        }
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
        const baseInterval = 8000; // 8 seconds base (much more responsive)
        const randomFactor = Math.random() * 5000; // 0-5 seconds random
        
        switch (personality) {
            case 'chatty': return baseInterval * 0.1 + randomFactor; // 0.8s - 5.8s
            case 'social': return baseInterval * 0.2 + randomFactor; // 1.6s - 6.6s
            case 'friendly': return baseInterval * 0.3 + randomFactor; // 2.4s - 7.4s
            case 'casual': return baseInterval * 0.4 + randomFactor; // 3.2s - 8.2s
            case 'responsive': return baseInterval * 0.5 + randomFactor; // 4s - 9s
            case 'lurker': return baseInterval * 1.0 + randomFactor; // 8s - 13s
            default: return baseInterval * 0.3 + randomFactor;
        }
    }

    /**
     * Get personality-based chat probability bonus
     */
    getPersonalityChatBonus(personality, userCount, recentMessageCount) {
        let bonus = 0.85; // increased base to 85% chance for more activity
        
        switch (personality) {
            case 'chatty':
                bonus = 0.95; // Always very eager to chat
                break;
            case 'social':
                bonus = userCount > 2 ? 0.9 : 0.75; // Loves crowds
                break;
            case 'friendly':
                bonus = 0.85; // Consistently friendly
                break;
            case 'casual':
                bonus = recentMessageCount < 2 ? 0.8 : 0.6; // Prefers quieter moments
                break;
            case 'responsive':
                bonus = recentMessageCount > 0 ? 0.85 : 0.5; // Responds to activity
                break;
            case 'lurker':
                bonus = 0.4; // Still rarely speaks but slightly more than before
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
     * Ensures better distribution of chatty bots across rooms
     */
    assignBotPersonality() {
        const personalities = [
            'chatty',      // Initiates conversations frequently
            'responsive',  // Mainly responds to others
            'social',      // Asks questions and engages
            'casual',      // Makes light, casual comments
            'friendly',    // Welcoming and positive
            'lurker'       // Rarely talks, mostly observes
        ];
        
        // Improved distribution - ensure more active talkers (60% active vs 40% passive)
        const weights = [25, 25, 15, 15, 15, 5]; // percentages
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
     * Assign personality with room balancing to ensure each room gets chatty bots
     */
    assignBotPersonalityBalanced(roomId) {
        // Get current bots in this room
        const roomBots = Array.from(this.bots.values()).filter(bot => bot.currentRoomId === roomId);
        
        // Count personalities in this room
        const personalityCounts = {
            'chatty': 0,
            'responsive': 0,
            'social': 0,
            'casual': 0,
            'friendly': 0,
            'lurker': 0
        };
        
        roomBots.forEach(bot => {
            if (personalityCounts.hasOwnProperty(bot.chatPersonality)) {
                personalityCounts[bot.chatPersonality]++;
            }
        });
        
        const totalRoomBots = roomBots.length;
        
        // If room has fewer than 3 chatty bots and this is one of the first 10 bots, make it chatty
        if (personalityCounts.chatty < 3 && totalRoomBots < 10) {
            return 'chatty';
        }
        
        // If room has fewer than 5 active talkers (chatty + social) and less than 15 bots, prioritize active
        const activeTalkers = personalityCounts.chatty + personalityCounts.social;
        if (activeTalkers < 5 && totalRoomBots < 15) {
            return Math.random() < 0.7 ? 'chatty' : 'social';
        }
        
        // Otherwise use normal distribution
        return this.assignBotPersonality();
    }

    /**
     * Assign a consistent text style to a bot - each bot will always use the same style
     */
    assignBotTextStyle() {
        const styleNames = Object.keys(BOT_CONFIG.TEXT_STYLES);
        const randomIndex = Math.floor(Math.random() * styleNames.length);
        return styleNames[randomIndex];
    }

    /**
     * Get current bot configuration
     */
    getBotConfig() {
        return this.currentConfig;
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
    }    /**
     * Make random bots chat - Much more realistic timing and behavior
     */
    performRandomChat() {
        if (this.bots.size === 0) return;

        const activeBots = Array.from(this.bots.values()).filter(bot => bot.currentRoomId);
        if (activeBots.length === 0) return;

        // MUCH higher chat probability for very active rooms
        // With 50 bots, we want 3-5 bots to chat per 8-second interval
        const baseChatProbability = Math.min(0.95, 0.6 + (0.3 / Math.max(1, activeBots.length / 15)));
        
        // Allow multiple bots to chat in the same interval
        const maxBotsToChat = Math.min(5, Math.max(1, Math.floor(activeBots.length / 10)));
        
        for (let i = 0; i < maxBotsToChat; i++) {
            if (Math.random() > baseChatProbability) continue;

            // Select a bot based on personality weights
            const chattingBot = this.selectBotByPersonality(activeBots);
            if (!chattingBot) continue;
            
            // Check if this bot has chatted recently (prevent individual spam)
            const timeSinceLastChat = Date.now() - chattingBot.lastChatTime;
            const minTimeBetweenChats = this.getMinChatInterval(chattingBot.chatPersonality);
            
            if (timeSinceLastChat < minTimeBetweenChats) continue;

            // Check room activity level
            const room = serverState.getRoom(chattingBot.currentRoomId);
            if (!room) continue;

            const recentMessages = this.getRecentRoomMessages(room.id);
            const roomUsers = room.getAllUsers().filter(u => !serverState.getUser(u.uid)?.isBot);
            
            // Much more active when no real users are present
            if (roomUsers.length === 0) {
                // Chat 95% of the time when no real users are present (more active)
                if (Math.random() > 0.95) continue;
            }

            // Less restrictive room activity check
            if (recentMessages.length > 8 && Math.random() > 0.7) continue;

            // Enhanced personality-based chat probability
            const personalityBonus = this.getPersonalityChatBonus(chattingBot.chatPersonality, roomUsers.length, recentMessages.length);
            if (Math.random() > personalityBonus) continue;

            this.makeBotChat(chattingBot);
        }
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
                responsePool.push(
                    "tell me more!", "that's interesting", "oh really?", "go on...", "wait what?", "no way!",
                    "that's so cool!", "I love hearing about this stuff", "keep talking, this is fascinating",
                    "oh my god yes, tell me everything about this because I'm genuinely invested now",
                    "this is exactly the kind of conversation I was hoping to have today, you've got my full attention",
                    "okay I need to hear the whole story because what you just said has completely captured my interest and I must know more details"
                );
                break;
            case 'social':
                responsePool.push(
                    "anyone else agree?", "what do you all think?", "same here!", "who else has experienced this?",
                    "let's all discuss this", "I want to hear everyone's thoughts", "this is a great topic for the group",
                    "this is something we should all talk about because I bet everyone has different perspectives on it",
                    "I love when the room gets into discussions like this, everyone always has such interesting viewpoints to share",
                    "this is why I love coming here, we always end up having these amazing conversations where everyone contributes something valuable"
                );
                break;
            case 'friendly':
                responsePool.push(
                    "that's nice :)", "sounds good!", "awesome!", "love it!", "so sweet!", "that's wonderful!",
                    "you're so right about that", "I'm really happy to hear that", "that sounds absolutely lovely",
                    "that's such a positive way to look at it, I really appreciate your optimistic perspective on things",
                    "you always manage to find the bright side of everything and it's honestly one of the things I love most about talking with you",
                    "your positive energy is absolutely contagious and it always makes me feel better about whatever's going on in my life"
                );
                break;
            case 'casual':
                responsePool = responsePool.filter(r => r.length <= 15); // Keep only shorter casual responses
                responsePool.push("cool", "nice", "word", "bet", "facts", "mood", "vibe", "lit", "same energy");
                break;
            case 'lurker':
                responsePool = [
                    "yeah", "ok", "true", "yep", "mhm", "sure", "k", "right", "maybe", "idk",
                    "fair point", "makes sense", "agreed", "pretty much", "basically"
                ]; // Very minimal responses only
                break;
            case 'responsive':
                responsePool.push(
                    "that's a really good point", "I hadn't thought of it that way", "thanks for sharing that",
                    "that really makes me think", "you've given me something to consider",
                    "that's actually a perspective I haven't considered before and it's making me rethink some things",
                    "I really appreciate you taking the time to explain that because it's helped me understand the situation better",
                    "your comment really resonated with me and I think it's exactly what I needed to hear right now, thank you for that insight"
                );
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
                // Add lots of longer, engaging messages
                contextualMessages.push(
                    "so what's everyone up to?", "tell me about your day", "anyone have exciting plans?", "what's new with everyone?",
                    "I'm in such a talkative mood today, someone please start an interesting conversation with me",
                    "has anyone else been thinking about how weird it is that we're all here talking to strangers on the internet but somehow it feels totally normal now?",
                    "okay random question but if you could only eat one food for the rest of your life what would it be? I've been debating this with myself for like an hour"
                );
                // Include all message lengths
                break;
                
            case 'social':
                // Add engaging group-focused messages
                contextualMessages.push(
                    "anyone else here from the west coast?", "what does everyone do for work?", "how's everyone's week going?", "anyone have weekend plans?",
                    "I love getting to know the people in this room, everyone always has such interesting stories to tell",
                    "this room has the best community, I've met so many cool people here and learned about things I never would have discovered otherwise"
                );
                // Prefer medium to long messages that engage others
                contextualMessages = contextualMessages.filter(msg => msg.length >= 15);
                break;
                
            case 'friendly':
                // Add warm, positive messages of varying lengths
                contextualMessages.push(
                    "hope everyone's having a great day!", "sending good vibes to all", "you're all awesome!", "happy to be here with you all",
                    "just wanted to say hi and let everyone know they're appreciated",
                    "this room always brightens my day, you all are such wonderful people and I'm grateful to be part of this community"
                );
                // Filter out overly negative or neutral messages
                contextualMessages = contextualMessages.filter(msg => 
                    !msg.includes('stressed') && !msg.includes('terrible') && !msg.includes('worst')
                );
                break;
                
            case 'casual':
                // Much more variety - from very short to medium length
                contextualMessages.push(
                    "sup", "what's good", "chillin", "just vibing", "same old same old",
                    "not much happening here", "pretty standard day", "just hanging out",
                    "nothing too exciting but that's fine with me honestly"
                );
                // Keep a mix of short and medium messages, remove very long ones
                contextualMessages = contextualMessages.filter(msg => msg.length <= 60);
                break;
                
            case 'lurker':
                // Very minimal messages only - mostly very short
                contextualMessages = [
                    "hey", "hi", "sup", "morning", "afternoon", "evening", "night",
                    "what's up", "hi all", "hello everyone", "good morning", "good afternoon",
                    "not much", "just lurking", "quiet today", "same here"
                ];
                break;
                
            case 'responsive':
                // Add thoughtful, medium-length messages
                contextualMessages.push(
                    "interesting discussion happening here", "good point someone made earlier", "thanks for sharing that perspective",
                    "I've been thinking about what someone said earlier and it really made sense",
                    "this room always gives me something to think about, the conversations here are genuinely thought-provoking"
                );
                // Prefer messages that could lead to responses
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

        // Apply the bot's consistent text style
        if (bot.textStyle && BOT_CONFIG.TEXT_STYLES[bot.textStyle]) {
            const styleFormatter = BOT_CONFIG.TEXT_STYLES[bot.textStyle].format;
            const originalMessage = message;
            message = styleFormatter(message);
            
            // Debug logging for text formatting
            if (Math.random() < 0.1) { // Log 10% of messages for debugging
                logger.debug('Applied text style', {
                    botUid: bot.uid,
                    textStyle: bot.textStyle,
                    originalMessage: originalMessage.substring(0, 30),
                    formattedMessage: message.substring(0, 50)
                });
            }
        } else {
            // Log when no text style is applied
            if (Math.random() < 0.1) {
                logger.debug('No text style applied', {
                    botUid: bot.uid,
                    textStyle: bot.textStyle,
                    hasStyleInConfig: !!BOT_CONFIG.TEXT_STYLES[bot.textStyle]
                });
            }
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
            
            // Reduce debug logging for performance with large bot counts
            if (this.bots.size < 100 || Math.random() < 0.1) {
                logger.debug('Bot sent message', {
                    botUid: bot.uid,
                    botNickname: bot.nickname,
                    roomId: room.id,
                    roomName: room.name,
                    message: message.substring(0, 50),
                    personality: bot.chatPersonality,
                    textStyle: bot.textStyle,
                    timeContext: currentHour >= 6 && currentHour < 12 ? 'morning' : 
                               currentHour >= 12 && currentHour < 17 ? 'afternoon' : 
                               currentHour >= 17 && currentHour < 22 ? 'evening' : 'night'
                });
            }

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
     * Move a bot to a random room (optimized)
     */
    moveBotToRandomRoom(bot, availableRooms) {
        const currentRoom = serverState.getRoom(bot.currentRoomId);
        const newRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
        
        if (!newRoom || newRoom.id === bot.currentRoomId) return;

        try {
            // Leave current room
            if (currentRoom && currentRoom.hasUser(bot.uid)) {
                // Send disconnect notification to real users BEFORE removing bot
                this.sendBotDisconnectNotification(currentRoom, bot);
                
                // Now remove the bot from current room
                currentRoom.removeUser({ uid: bot.uid });
                // Update room count cache
                this.updateBotRoomCount(bot.currentRoomId, -1);
            }

            // Join new room
            const botUserData = serverState.getUser(bot.uid);
            if (botUserData && newRoom.addUser(botUserData, true, false)) {
                bot.currentRoomId = newRoom.id;
                bot.lastMoveTime = Date.now();
                // Update room count cache
                this.updateBotRoomCount(newRoom.id, 1);
                
                // Send join notification to real users in the new room
                this.sendBotJoinNotification(newRoom, bot);
                
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
            // Validate packet type first
            if (!PACKET_TYPES.ROOM_USER_LEFT) {
                logger.error('PACKET_TYPES.ROOM_USER_LEFT is undefined', { 
                    packetTypes: Object.keys(PACKET_TYPES || {}),
                    roomUserLeft: PACKET_TYPES.ROOM_USER_LEFT 
                });
                return;
            }
            
            // Create user left notification packet (same format as in packetProcessor.js)
            const userLeftBuffer = Buffer.alloc(8);
            userLeftBuffer.writeUInt32BE(room.id, 0);  // Room ID as 4-byte big-endian
            userLeftBuffer.writeUInt32BE(bot.uid, 4);  // Bot UID as 4-byte big-endian

            let notificationsSent = 0;
            room.getAllUsers().forEach(roomUserData => {
                // Only send to real users (not other bots)
                if (roomUserData.uid < BOT_CONFIG.BOT_UID_START) {
                    const user = serverState.getUser(roomUserData.uid);
                    if (user && user.socket && !user.isBot) {
                        try {
                            sendPacket(user.socket, PACKET_TYPES.ROOM_USER_LEFT, userLeftBuffer, user.socket.id);
                            notificationsSent++;
                        } catch (error) {
                            logger.warn('Failed to send bot disconnect notification', { 
                                botUid: bot.uid, 
                                botNickname: bot.nickname,
                                userUid: user.uid,
                                userNickname: user.nickname,
                                roomId: room.id,
                                error: error.message 
                            });
                        }
                    }
                }
            });
            
            // CRITICAL: Send updated user list to refresh the room display
            // Note: User list will be updated automatically when clients process the disconnect notifications
            setTimeout(() => {
                // Allow time for disconnect notifications to be processed
                logger.debug('Bot disconnect notifications completed for room', {
                    roomId: room.id,
                    roomName: room.name,
                    notificationsSent
                });
            }, 100); // Small delay to ensure the user left packet is processed first
            
            if (notificationsSent > 0) {
                logger.debug('Bot disconnect notifications sent', {
                    botUid: bot.uid,
                    botNickname: bot.nickname,
                    roomId: room.id,
                    roomName: room.name,
                    notificationsSent
                });
            }
        } catch (error) {
            logger.warn('Failed to send bot disconnect notifications', {
                botUid: bot.uid,
                botNickname: bot.nickname,
                roomId: room.id,
                error: error.message
            });
        }
    }

    /**
     * Send join notification to real users when a bot joins a room
     */
    sendBotJoinNotification(room, bot) {
        try {
            // Validate packet type first
            if (!PACKET_TYPES.ROOM_USER_JOINED) {
                logger.error('PACKET_TYPES.ROOM_USER_JOINED is undefined', { 
                    packetTypes: Object.keys(PACKET_TYPES || {}),
                    roomUserJoined: PACKET_TYPES.ROOM_USER_JOINED 
                });
                return;
            }
            
            // Get bot's room data to include in notification
            const botRoomData = room.getUser(bot.uid);
            if (!botRoomData) {
                logger.warn('Bot not found in room data for join notification', {
                    botUid: bot.uid,
                    roomId: room.id
                });
                return;
            }
            
            // Create user joined notification packet using the same format as regular users
            // Format: group_id=X\nuid=Y\nnickname=Z\nadmin=W\ncolor=V\nmic=U\npub=T\naway=S + delimiter
            const userJoinedString = `group_id=${room.id}\nuid=${bot.uid}\nnickname=${bot.nickname}\nadmin=${botRoomData.admin}\ncolor=${botRoomData.color}\nmic=${botRoomData.mic}\npub=${botRoomData.pub}\naway=${botRoomData.away}`;
            const userJoinedBuffer = Buffer.concat([
                Buffer.from(userJoinedString),
                Buffer.from([0xC8]) // Delimiter
            ]);

            let notificationsSent = 0;
            room.getAllUsers().forEach(roomUserData => {
                // Only send to real users (not other bots)
                if (roomUserData.uid < BOT_CONFIG.BOT_UID_START) {
                    const user = serverState.getUser(roomUserData.uid);
                    if (user && user.socket && !user.isBot) {
                        try {
                            sendPacket(user.socket, PACKET_TYPES.ROOM_USER_JOINED, userJoinedBuffer, user.socket.id);
                            notificationsSent++;
                        } catch (error) {
                            logger.warn('Failed to send bot join notification', { 
                                botUid: bot.uid, 
                                botNickname: bot.nickname,
                                userUid: user.uid,
                                userNickname: user.nickname,
                                roomId: room.id,
                                error: error.message 
                            });
                        }
                    }
                }
            });
            
            if (notificationsSent > 0) {
                logger.info('Bot join notifications sent with detailed format', {
                    botUid: bot.uid,
                    botNickname: bot.nickname,
                    roomId: room.id,
                    roomName: room.name,
                    notificationsSent,
                    userJoinedString
                });
                
                // Also send updated user list to refresh the room display (like regular user joins)
                if (this.serverState && this.serverState.packetProcessor) {
                    this.serverState.packetProcessor.broadcastUserListUpdate(room);
                    logger.debug('Bot join triggered user list update', {
                        botUid: bot.uid,
                        roomId: room.id
                    });
                }
            }
        } catch (error) {
            logger.warn('Failed to send bot join notifications', {
                botUid: bot.uid,
                botNickname: bot.nickname,
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
            },
            botDetails: []
        };

        // Count bots per room and collect details
        for (const bot of this.bots.values()) {
            if (bot.currentRoomId) {
                const room = serverState.getRoom(bot.currentRoomId);
                const roomName = room ? room.name : `Room ${bot.currentRoomId}`;
                stats.botsPerRoom[roomName] = (stats.botsPerRoom[roomName] || 0) + 1;
                
                // Add bot details for dashboard
                stats.botDetails.push({
                    uid: bot.uid,
                    nickname: bot.nickname,
                    roomId: bot.currentRoomId,
                    roomName: roomName,
                    chatPersonality: bot.chatPersonality,
                    textStyle: bot.textStyle,
                    statusColor: bot.statusColor,
                    createdAt: bot.createdAt
                });
            }
            
            if (stats.botPersonalities[bot.chatPersonality] !== undefined) {
                stats.botPersonalities[bot.chatPersonality]++;
            }
        }

        return stats;
    }

    /**
     * Calculate optimal batch size based on bot count and system resources
     */
    calculateOptimalBatchSize(botCount) {
        if (botCount <= 100) return 25;        // Small batches for small numbers
        if (botCount <= 500) return 50;        // Medium batches for medium numbers  
        if (botCount <= 1000) return 75;       // Larger batches for better throughput
        if (botCount <= 2500) return 100;      // Optimized for thousands
        return 150;                            // Maximum batch size for very large numbers
    }

    /**
     * Calculate delay between batches based on performance
     */
    calculateBatchDelay(batchTime, batchSize) {
        const targetTimePerBot = 10; // Target 10ms per bot
        const actualTimePerBot = batchTime / batchSize;
        
        // If we're going too fast, add a small delay
        if (actualTimePerBot < targetTimePerBot) {
            return Math.min(50, (targetTimePerBot - actualTimePerBot) * batchSize);
        }
        
        // If we're going slow, no additional delay needed
        return 0;
    }

    /**
     * Pre-calculate room assignments for better performance
     */
    preCalculateRoomAssignments(botCount, availableRooms, distributionMode) {
        const assignments = new Array(botCount);
        
        switch (distributionMode) {
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM:
                assignments.fill(availableRooms[0]);
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED:
                // Pre-calculate balanced distribution
                for (let i = 0; i < botCount; i++) {
                    assignments[i] = availableRooms[i % availableRooms.length];
                }
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED:
                // Distribute across specified rooms
                for (let i = 0; i < botCount; i++) {
                    assignments[i] = availableRooms[i % availableRooms.length];
                }
                break;
                
            case BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM:
            default:
                // Pre-generate random assignments
                for (let i = 0; i < botCount; i++) {
                    assignments[i] = availableRooms[Math.floor(Math.random() * availableRooms.length)];
                }
                break;
        }
        
        return assignments;
    }

    /**
     * Optimized single bot creation with reduced overhead
     */
    async createSingleBotOptimized(index, assignedRoom, distributionMode) {
        try {
            // Generate bot data efficiently
            const botName = this.generateBotName();
            const botUid = BOT_CONFIG.BOT_UID_START + index;
            const personality = this.assignBotPersonality();
            const statusColor = this.assignBotStatusColor();
            
            // Create bot object with minimal allocations
            const bot = {
                uid: botUid,
                nickname: botName,
                mode: USER_MODES.ONLINE,
                currentRoomId: assignedRoom.id,
                isBot: true,
                createdAt: Date.now(),
                lastChatTime: Date.now() - 30000, // Set to 30 seconds ago so they can chat soon
                lastMoveTime: Date.now(),
                chatPersonality: personality,
                statusColor: statusColor,
                textStyle: this.assignBotTextStyle(), // Assign consistent text formatting style
                distributionMode: distributionMode
            };

            // Create user data with optimized approach
            const botUserData = new User({
                uid: botUid,
                nickname: botName,
                email: `bot${botUid}@paltalk.local`,
                first: 'Bot',
                last: 'User',
                admin: 0,
                created: Date.now(),
                last_login: Date.now(),
                listed: 0,
                verified: 1
            });
            
            // Set bot-specific properties efficiently
            botUserData.mode = USER_MODES.ONLINE;
            botUserData.socket = null;
            botUserData.isBot = true;
            botUserData.color = statusColor;
            
            // Add basic room tracking methods for bots to ensure proper cleanup
            if (!botUserData.currentRooms) {
                botUserData.currentRooms = new Set();
            }
            
            // Implement removeFromRoom method if it doesn't exist
            if (typeof botUserData.removeFromRoom !== 'function') {
                botUserData.removeFromRoom = function(roomId) {
                    if (this.currentRooms) {
                        this.currentRooms.delete(roomId);
                    }
                };
            }
            
            // Implement addToRoom method if it doesn't exist
            if (typeof botUserData.addToRoom !== 'function') {
                botUserData.addToRoom = function(roomId) {
                    if (this.currentRooms) {
                        this.currentRooms.add(roomId);
                    }
                };
            }
            
            // Add to server state and room in one operation
            serverState.users.set(botUid, botUserData);
            
            // Room capacity check (optimized)
            const currentBotCount = this.getBotsInRoom(assignedRoom.id);
            if (currentBotCount >= BOT_CONFIG.MAX_BOTS_PER_ROOM) {
                logger.debug('Room at capacity, bot created but may not be added to room', {
                    roomId: assignedRoom.id,
                    roomName: assignedRoom.name,
                    currentBots: currentBotCount
                });
            }
            
            // Add bot to room (with error handling but no exceptions)
            const addedToRoom = assignedRoom.addUser(botUserData, true, false);
            if (!addedToRoom) {
                logger.debug('Bot created but not added to room (room may be full)', {
                    botUid: botUid,
                    botName: botName,
                    roomId: assignedRoom.id
                });
            } else {
                // Send join notification to real users in the room
                this.sendBotJoinNotification(assignedRoom, bot);
            }

            return bot;
            
        } catch (error) {
            logger.warn('Failed to create optimized bot', { 
                index, 
                roomId: assignedRoom?.id,
                error: error.message 
            });
            return null;
        }
    }

    // ...existing code...
}

module.exports = new BotManager();
