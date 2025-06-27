/**
 * Database manager with improved error handling and connection management
 */
const sqlite3 = require('sqlite3').verbose();
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');

class DatabaseManager {
    constructor(dbPath = 'database.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
        
        // Performance tracking
        this.performanceMetrics = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            averageQueryTime: 0,
            lastQueryTime: 0,
            connectionPool: {
                active: 0,
                idle: 0,
                pending: 0
            }
        };
        
        // Query performance history (last 100 queries)
        this.queryHistory = [];
        this.maxHistorySize = 100;
        
        // Connection health monitoring
        this.lastHealthCheck = Date.now();
        this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(SERVER_CONFIG.DATABASE_PATH, (err) => {
                if (err) {
                    logger.error('Failed to connect to database', err);
                    reject(err);
                } else {
                    this.isConnected = true;
                    logger.info('Connected to SQLite database', { 
                        path: SERVER_CONFIG.DATABASE_PATH 
                    });
                    resolve();
                }
            });
        });
    }

    /**
     * Get user by UID
     * @param {number} uid 
     * @returns {Promise<Object|null>}
     */
    async getUserByUid(uid) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE uid = ?',
                [uid],
                (err, row) => {
                    if (err) {
                        logger.error('Failed to get user by UID', err, { uid });
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                }
            );
        });
    }

    /**
     * Get user by nickname
     * @param {string} nickname 
     * @returns {Promise<Object|null>}
     */
    async getUserByNickname(nickname) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE nickname = ? COLLATE NOCASE',
                [nickname],
                (err, row) => {
                    if (err) {
                        logger.error('Failed to get user by nickname', err, { nickname });
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                }
            );
        });
    }

    /**
     * Search users by nickname
     * @param {string} nickname 
     * @param {boolean} exactMatch 
     * @returns {Promise<Array>}
     */
    async searchUsersByNickname(nickname, exactMatch = false) {
        return new Promise((resolve, reject) => {
            const query = exactMatch 
                ? 'SELECT * FROM users WHERE nickname = ? AND listed = 1 COLLATE NOCASE'
                : 'SELECT * FROM users WHERE nickname LIKE ? AND listed = 1 COLLATE NOCASE';
            
            const param = exactMatch ? nickname : `${nickname}%`;

            this.db.all(query, [param], (err, rows) => {
                if (err) {
                    logger.error('Failed to search users', err, { nickname, exactMatch });
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Update user buddies list
     * @param {number} uid 
     * @param {Array} buddies 
     * @returns {Promise<boolean>}
     */
    async updateUserBuddies(uid, buddies) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET buddies = ? WHERE uid = ?',
                [JSON.stringify(buddies), uid],
                function(err) {
                    if (err) {
                        logger.error('Failed to update user buddies', err, { uid });
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    /**
     * Update user last login time
     * @param {number} uid 
     * @returns {Promise<boolean>}
     */
    async updateUserLastLogin(uid) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE uid = ?',
                [uid],
                function(err) {
                    if (err) {
                        logger.error('Failed to update user last login', err, { uid });
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    /**
     * Get user by UID
     * @param {number} uid 
     * @returns {Promise<Object|null>}
     */
    async getUserByUid(uid) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE uid = ?',
                [uid],
                (err, row) => {
                    if (err) {
                        logger.error('Failed to get user by UID', err, { uid });
                        reject(err);
                    } else {
                        resolve(row || null);
                    }
                }
            );
        });
    }

    /**
     * Update user information
     * @param {number} uid 
     * @param {Object} updateData 
     * @returns {Promise<boolean>}
     */
    async updateUser(uid, updateData) {
        return new Promise((resolve, reject) => {
            const {
                nickname,
                email,
                firstName = '',
                lastName = '',
                paid1,
                admin,
                listed = 1
            } = updateData;

            this.db.run(
                `UPDATE users 
                 SET nickname = ?, email = ?, first = ?, last = ?, 
                     paid1 = ?, admin = ?, listed = ? 
                 WHERE uid = ?`,
                [nickname, email, firstName, lastName, paid1, admin, listed, uid],
                function(err) {
                    if (err) {
                        logger.error('Failed to update user', err, { uid, updateData });
                        reject(err);
                    } else {
                        logger.info('User updated successfully', { uid, changes: this.changes });
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    /**
     * Delete user permanently
     * @param {number} uid 
     * @returns {Promise<boolean>}
     */
    async deleteUser(uid) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Delete user's offline messages
                this.db.run('DELETE FROM offline_messages WHERE sender = ? OR receiver = ?', [uid, uid]);
                
                // Delete the user
                this.db.run('DELETE FROM users WHERE uid = ?', [uid], function(err) {
                    if (err) {
                        logger.error('Failed to delete user', err, { uid });
                        this.db.run('ROLLBACK');
                        reject(err);
                    } else {
                        this.db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                logger.error('Failed to commit user deletion', commitErr, { uid });
                                reject(commitErr);
                            } else {
                                logger.info('User deleted successfully', { uid, changes: this.changes });
                                resolve(this.changes > 0);
                            }
                        });
                    }
                });
            });
        });
    }

    /**
     * Update user information
     * @param {number} uid 
     * @param {Object} updateData 
     * @returns {Promise<boolean>}
     */
    async updateUser(uid, updateData) {
        return new Promise((resolve, reject) => {
            const {
                nickname,
                email,
                firstName,
                lastName,
                paid1,
                admin,
                listed
            } = updateData;

            this.db.run(
                `UPDATE users SET 
                    nickname = ?, 
                    email = ?, 
                    first = ?, 
                    last = ?, 
                    paid1 = ?, 
                    admin = ?, 
                    listed = ?
                WHERE uid = ?`,
                [nickname, email, firstName || '', lastName || '', paid1, admin, listed, uid],
                function(err) {
                    if (err) {
                        logger.error('Failed to update user', err, { uid, updateData });
                        reject(err);
                    } else {
                        logger.info('User updated successfully', { uid, changes: this.changes });
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    /**
     * Delete user from database
     * @param {number} uid 
     * @returns {Promise<boolean>}
     */
    async deleteUser(uid) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Delete from offline_messages
                this.db.run('DELETE FROM offline_messages WHERE sender = ? OR receiver = ?', [uid, uid]);
                
                // Delete user
                this.db.run('DELETE FROM users WHERE uid = ?', [uid], function(err) {
                    if (err) {
                        logger.error('Failed to delete user', err, { uid });
                        reject(err);
                        return;
                    }
                    
                    const deleted = this.changes > 0;
                    
                    if (deleted) {
                        logger.info('User deleted successfully', { uid });
                    } else {
                        logger.warn('No user found to delete', { uid });
                    }
                    
                    resolve(deleted);
                });
                
                this.db.run('COMMIT');
            });
        });
    }

    /**
     * Get all categories
     * @returns {Promise<Array>}
     */
    async getCategories() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM categories ORDER BY code',
                [],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get categories', err);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Get all groups (rooms) with their category information
     * @returns {Promise<Array>}
     */
    async getGroups() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT g.*, c.value as category_name FROM groups g LEFT JOIN categories c ON g.catg = c.code ORDER BY g.id',
                [],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get groups', err);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Get all permanent rooms
     * @returns {Promise<Array>}
     */
    async getPermanentRooms() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM groups ORDER BY id',
                [],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get permanent rooms', err);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Update room information
     * @param {number} roomId 
     * @param {Object} updateData 
     * @returns {Promise<boolean>}
     */
    async updateRoom(roomId, updateData) {
        return new Promise((resolve, reject) => {
            const {
                nm,
                catg,
                r,
                v,
                p,
                l,
                password,
                c,
                topic,
                mike,
                text,
                video,
                owner,
                cr,
                isClosed
            } = updateData;

            // Build dynamic SQL based on which fields are provided
            const fields = [];
            const values = [];

            if (nm !== undefined) { fields.push('nm = ?'); values.push(nm); }
            if (catg !== undefined) { fields.push('catg = ?'); values.push(catg); }
            if (r !== undefined) { fields.push('r = ?'); values.push(r); }
            if (v !== undefined) { fields.push('v = ?'); values.push(v); }
            if (p !== undefined) { fields.push('p = ?'); values.push(p); }
            if (l !== undefined) { fields.push('l = ?'); values.push(l); }
            if (password !== undefined) { fields.push('password = ?'); values.push(password); }
            if (c !== undefined) { fields.push('c = ?'); values.push(c); }
            if (topic !== undefined) { fields.push('topic = ?'); values.push(topic); }
            if (mike !== undefined) { fields.push('mike = ?'); values.push(mike); }
            if (text !== undefined) { fields.push('text = ?'); values.push(text); }
            if (video !== undefined) { fields.push('video = ?'); values.push(video); }
            if (owner !== undefined) { fields.push('owner = ?'); values.push(owner); }
            if (cr !== undefined) { fields.push('cr = ?'); values.push(cr); }
            if (isClosed !== undefined) { fields.push('isClosed = ?'); values.push(isClosed ? 1 : 0); }

            if (fields.length === 0) {
                logger.warn('No fields to update in room', { roomId });
                resolve(false);
                return;
            }

            values.push(roomId); // Add roomId for WHERE clause

            const sql = `UPDATE groups SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(sql, values, function(err) {
                if (err) {
                    logger.error('Failed to update room', err, { roomId, updateData });
                    reject(err);
                } else {
                    logger.info('Room updated successfully', { 
                        roomId, 
                        changes: this.changes,
                        fieldsUpdated: fields.length 
                    });
                    resolve(this.changes > 0);
                }
            });
        });
    }

    /**
     * Store offline message
     * @param {number} sender 
     * @param {number} receiver 
     * @param {string} content 
     * @param {string} status 
     * @returns {Promise<number>} - Message ID
     */
    async storeOfflineMessage(sender, receiver, content, status = 'pending') {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO offline_messages (sender, receiver, content, status) VALUES (?, ?, ?, ?)',
                [sender, receiver, content, status],
                function(err) {
                    if (err) {
                        logger.error('Failed to store offline message', err, { 
                            sender, 
                            receiver 
                        });
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    /**
     * Get offline messages for user
     * @param {number} receiverUid 
     * @param {string} status 
     * @returns {Promise<Array>}
     */
    async getOfflineMessages(receiverUid, status = 'pending') {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM offline_messages WHERE receiver = ? AND status = ? ORDER BY sent ASC',
                [receiverUid, status],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get offline messages', err, { receiverUid });
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Mark offline messages as sent
     * @param {Array<number>} messageIds 
     * @returns {Promise<boolean>}
     */
    async markMessagesAsSent(messageIds) {
        if (messageIds.length === 0) return true;

        return new Promise((resolve, reject) => {
            const placeholders = messageIds.map(() => '?').join(',');
            const query = `UPDATE offline_messages SET status = 'sent' WHERE id IN (${placeholders})`;
            
            this.db.run(query, messageIds, function(err) {
                if (err) {
                    logger.error('Failed to mark messages as sent', err, { messageIds });
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    /**
     * Store email invite
     * @param {string} email 
     * @returns {Promise<number>} - Invite ID
     */
    async storeEmailInvite(email) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO email_invites (email, requestedAt, status) VALUES (?, ?, ?)',
                [email, new Date().toISOString(), 'pending'],
                function(err) {
                    if (err) {
                        logger.error('Failed to store email invite', err, { email });
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        return new Promise((resolve, reject) => {
            const queries = [
                'SELECT COUNT(*) as userCount FROM users',
                'SELECT COUNT(*) as onlineUsers FROM users WHERE last_login > datetime("now", "-1 hour")',
                'SELECT COUNT(*) as roomCount FROM groups',
                'SELECT COUNT(*) as categoryCount FROM categories',
                'SELECT COUNT(*) as pendingMessages FROM offline_messages WHERE status = "pending"'
            ];

            const stats = {};
            let completedQueries = 0;

            queries.forEach((query, index) => {
                this.db.get(query, [], (err, row) => {
                    if (err) {
                        logger.error('Failed to get database stats', err, { query });
                        reject(err);
                        return;
                    }

                    const key = Object.keys(row)[0];
                    stats[key] = row[key];
                    completedQueries++;

                    if (completedQueries === queries.length) {
                        resolve(stats);
                    }
                });
            });
        });
    }

    /**
     * Execute query with performance monitoring
     * @param {string} sql 
     * @param {Array} params 
     * @param {string} method - 'get', 'all', or 'run'
     * @returns {Promise}
     */
    async executeQuery(sql, params = [], method = 'run') {
        const startTime = Date.now();
        this.performanceMetrics.totalQueries++;
        
        return new Promise((resolve, reject) => {
            const callback = (err, result) => {
                const queryTime = Date.now() - startTime;
                this.updateQueryMetrics(queryTime, err);
                
                if (err) {
                    this.performanceMetrics.failedQueries++;
                    logger.error('Database query failed', err, { sql, params });
                    reject(err);
                } else {
                    resolve(result);
                }
            };

            try {
                switch (method) {
                    case 'get':
                        this.db.get(sql, params, callback);
                        break;
                    case 'all':
                        this.db.all(sql, params, callback);
                        break;
                    case 'run':
                    default:
                        this.db.run(sql, params, function(err) {
                            callback(err, { lastID: this.lastID, changes: this.changes });
                        });
                        break;
                }
            } catch (error) {
                this.performanceMetrics.failedQueries++;
                reject(error);
            }
        });
    }

    /**
     * Enhanced query method with performance tracking
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Promise}
     */
    async query(sql, params = []) {
        const startTime = Date.now();
        
        try {
            this.performanceMetrics.totalQueries++;
            
            const result = await new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
            
            const queryTime = Date.now() - startTime;
            this.updatePerformanceMetrics(queryTime, true);
            
            logger.debug('Database query executed', {
                sql: sql.substring(0, 100),
                params: params.length,
                queryTime,
                rowCount: result.length
            });
            
            return result;
            
        } catch (error) {
            const queryTime = Date.now() - startTime;
            this.updatePerformanceMetrics(queryTime, false);
            
            logger.error('Database query failed', error, {
                sql: sql.substring(0, 100),
                params: params.length,
                queryTime
            });
            
            throw error;
        }
    }

    /**
     * Update query performance metrics
     * @param {number} queryTime 
     * @param {Error} error 
     */
    updateQueryMetrics(queryTime, error) {
        // Update average query time
        const total = this.performanceMetrics.totalQueries;
        this.performanceMetrics.averageQueryTime = 
            (this.performanceMetrics.averageQueryTime * (total - 1) + queryTime) / total;
        
        // Track slow queries (>100ms)
        if (queryTime > 100) {
            this.queryHistory.push({
                time: queryTime,
                timestamp: new Date(),
                error: error ? error.message : null
            });
            
            // Keep only last 100 slow queries
            if (this.queryHistory.length > this.maxHistorySize) {
                this.queryHistory.shift();
            }
        }
    }

    /**
     * Update performance metrics
     * @param {number} queryTime 
     * @param {boolean} success 
     */
    updatePerformanceMetrics(queryTime, success) {
        this.performanceMetrics.lastQueryTime = queryTime;
        
        if (success) {
            this.performanceMetrics.successfulQueries++;
        } else {
            this.performanceMetrics.failedQueries++;
        }
        
        // Update average query time
        const totalSuccessful = this.performanceMetrics.successfulQueries;
        if (totalSuccessful > 0) {
            this.performanceMetrics.averageQueryTime = 
                (this.performanceMetrics.averageQueryTime * (totalSuccessful - 1) + queryTime) / totalSuccessful;
        }
        
        // Add to query history
        this.queryHistory.push({
            timestamp: Date.now(),
            queryTime,
            success
        });
        
        // Keep history size limited
        if (this.queryHistory.length > this.maxHistorySize) {
            this.queryHistory.shift();
        }
    }

    /**
     * Execute transaction with queue management
     * @param {Function} transactionFn 
     * @returns {Promise}
     */
    async executeTransaction(transactionFn) {
        return new Promise((resolve, reject) => {
            this.transactionQueue.push({ transactionFn, resolve, reject });
            this.processTransactionQueue();
        });
    }

    /**
     * Process transaction queue
     */
    async processTransactionQueue() {
        if (this.isProcessingTransaction || this.transactionQueue.length === 0) {
            return;
        }

        this.isProcessingTransaction = true;
        const { transactionFn, resolve, reject } = this.transactionQueue.shift();

        try {
            await this.executeQuery('BEGIN TRANSACTION');
            const result = await transactionFn(this);
            await this.executeQuery('COMMIT');
            resolve(result);
        } catch (error) {
            await this.executeQuery('ROLLBACK');
            reject(error);
        } finally {
            this.isProcessingTransaction = false;
            // Process next transaction
            setImmediate(() => this.processTransactionQueue());
        }
    }

    /**
     * Get database performance metrics
     * @returns {Object}
     */
    getPerformanceMetrics() {
        const recentQueries = this.queryHistory.filter(q => 
            Date.now() - q.timestamp < 60000 // Last minute
        );
        
        return {
            ...this.performanceMetrics,
            isConnected: this.isConnected,
            recentQueriesPerMinute: recentQueries.length,
            successRate: this.performanceMetrics.totalQueries > 0 
                ? (this.performanceMetrics.successfulQueries / this.performanceMetrics.totalQueries * 100).toFixed(2)
                : 0,
            dbPath: this.dbPath
        };
    }

    /**
     * Optimize database performance
     */
    async optimize() {
        try {
            logger.info('Starting database optimization...');
            
            // Analyze tables
            await this.query('ANALYZE');
            
            // Vacuum database
            await this.query('VACUUM');
            
            // Update statistics
            await this.query('PRAGMA optimize');
            
            logger.info('Database optimization completed');
            return true;
            
        } catch (error) {
            logger.error('Database optimization failed', error);
            return false;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            this.db.close((err) => {
                if (err) {
                    logger.error('Failed to close database', err);
                    reject(err);
                } else {
                    this.isConnected = false;
                    logger.info('Database connection closed');
                    resolve();
                }
            });
        });
    }

    /**
     * Check if database is connected
     * @returns {boolean}
     */
    isConnectionActive() {
        return this.isConnected && this.db !== null;
    }

    /**
     * Get users who have a specific user on their buddy list
     * @param {number} targetUid - The user ID to check for in buddy lists
     * @returns {Promise<Array>} - Array of users who have targetUid on their buddy list
     */
    async getUsersWithBuddy(targetUid) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT uid, nickname, buddies FROM users WHERE buddies LIKE ? AND uid != ?`,
                [`%"uid": ${targetUid}%`, targetUid],
                (err, rows) => {
                    if (err) {
                        logger.error('Failed to get users with buddy', err, { targetUid });
                        reject(err);
                    } else {
                        // Filter results by parsing JSON to ensure accurate matches
                        const usersWithBuddy = rows.filter(row => {
                            try {
                                const buddies = JSON.parse(row.buddies || '[]');
                                return buddies.some(buddy => buddy.uid === targetUid);
                            } catch (parseError) {
                                logger.warn('Invalid buddy list JSON', { uid: row.uid, buddies: row.buddies });
                                return false;
                            }
                        });
                        
                        logger.debug('Found users with buddy', { 
                            targetUid, 
                            count: usersWithBuddy.length 
                        });
                        resolve(usersWithBuddy);
                    }
                }
            );
        });
    }
}

module.exports = DatabaseManager;
