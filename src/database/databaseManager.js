/**
 * Database manager with improved error handling and connection management
 */
const sqlite3 = require('sqlite3').verbose();
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isConnected = false;
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
     * Execute a custom query (for admin/debugging purposes)
     * @param {string} query 
     * @param {Array} params 
     * @returns {Promise<Array>}
     */
    async executeQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                this.db.all(query, params, (err, rows) => {
                    if (err) {
                        logger.error('Failed to execute query', err, { query });
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                });
            } else {
                this.db.run(query, params, function(err) {
                    if (err) {
                        logger.error('Failed to execute query', err, { query });
                        reject(err);
                    } else {
                        resolve({ 
                            changes: this.changes, 
                            lastID: this.lastID 
                        });
                    }
                });
            }
        });
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
}

module.exports = DatabaseManager;
