/**
 * MySQL Database manager with improved error handling and connection management
 */
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');

class MySQLDatabaseManager {
    constructor() {
        this.pool = null;
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
     * Initialize MySQL database connection pool
     */
    async initialize() {
        try {
            this.pool = mysql.createPool({
                host: SERVER_CONFIG.MYSQL_CONFIG.host,
                port: SERVER_CONFIG.MYSQL_CONFIG.port,
                user: SERVER_CONFIG.MYSQL_CONFIG.username,
                password: SERVER_CONFIG.MYSQL_CONFIG.password,
                database: SERVER_CONFIG.MYSQL_CONFIG.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                acquireTimeout: 60000,
                timeout: 60000,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });

            // Test the connection
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            this.isConnected = true;
            logger.info('Connected to MySQL database', { 
                host: SERVER_CONFIG.MYSQL_CONFIG.host,
                database: SERVER_CONFIG.MYSQL_CONFIG.database 
            });

            // Set up health check interval
            setInterval(() => this.healthCheck(), this.healthCheckInterval);

            return true;
        } catch (error) {
            logger.error('Failed to connect to MySQL database', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Get user by nickname
     */
    async getUserByNickname(nickname) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT uid, nickname, email, password, admin, sup, listed, buddies, color FROM users WHERE nickname = ?',
                [nickname]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error getting user by nickname', { error: error.message, nickname });
            throw error;
        }
    }

    /**
     * Get user by UID
     */
    async getUserByUid(uid) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT uid, nickname, email, password, admin, sup, listed, buddies, color FROM users WHERE uid = ?',
                [uid]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error getting user by UID', { error: error.message, uid });
            throw error;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT uid, nickname, email, password, admin, sup, listed, buddies, color FROM users WHERE email = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error getting user by email', { error: error.message, email });
            throw error;
        }
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        try {
            const [result] = await this.pool.execute(
                `INSERT INTO users (uid, nickname, email, password, admin, listed, buddies) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.uid,
                    userData.nickname,
                    userData.email,
                    userData.password,
                    userData.admin || 0,
                    userData.listed || 1,
                    userData.buddies || ''
                ]
            );
            
            logger.info('User created successfully', { uid: userData.uid, nickname: userData.nickname });
            return result.insertId;
        } catch (error) {
            logger.error('Error creating user', { error: error.message, userData });
            throw error;
        }
    }

    /**
     * Search users by nickname
     */
    async searchUsersByNickname(nickname, exactMatch = false) {
        try {
            let query, params;
            if (exactMatch) {
                query = 'SELECT uid, nickname FROM users WHERE nickname = ? AND listed = 1 ORDER BY nickname';
                params = [nickname];
            } else {
                query = 'SELECT uid, nickname FROM users WHERE nickname LIKE ? AND listed = 1 ORDER BY nickname LIMIT 20';
                params = [`${nickname}%`];
            }
            
            const [rows] = await this.pool.execute(query, params);
            return rows;
        } catch (error) {
            logger.error('Error searching users by nickname', { error: error.message, nickname });
            throw error;
        }
    }

    /**
     * Update user
     */
    async updateUser(uid, updateData) {
        try {
            const fields = [];
            const values = [];
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });
            
            values.push(uid);
            
            if (fields.length === 0) {
                logger.warn('No fields to update for user', { uid });
                return;
            }
            
            const sql = `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`;
            
            const [result] = await this.pool.execute(sql, values);
            
            if (result.affectedRows > 0) {
                logger.info('User updated successfully', { uid, updateData });
            } else {
                logger.warn('No user found to update', { uid });
            }
            
            return result;
        } catch (error) {
            logger.error('Error updating user', { error: error.message, uid, updateData });
            throw error;
        }
    }

    /**
     * Update user buddies
     */
    async updateUserBuddies(uid, buddies) {
        try {
            const buddiesString = Array.isArray(buddies) ? JSON.stringify(buddies) : buddies;
            await this.updateUser(uid, { buddies: buddiesString });
        } catch (error) {
            logger.error('Error updating user buddies', { error: error.message, uid });
            throw error;
        }
    }

    /**
     * Delete user (soft delete by setting listed = 0)
     */
    async deleteUser(uid) {
        try {
            // Start transaction
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();

            try {
                // Delete offline messages
                await connection.execute('DELETE FROM offline_messages WHERE sender = ? OR receiver = ?', [uid, uid]);
                
                // Delete user
                const [result] = await connection.execute('DELETE FROM users WHERE uid = ?', [uid]);
                
                await connection.commit();
                connection.release();
                
                if (result.affectedRows > 0) {
                    logger.info('User deleted successfully', { uid });
                    return true;
                } else {
                    logger.warn('No user found to delete', { uid });
                    return false;
                }
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            logger.error('Error deleting user', { error: error.message, uid });
            throw error;
        }
    }

    /**
     * Soft delete user (set listed = 0)
     */
    async softDeleteUser(uid) {
        try {
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();

            try {
                // Delete offline messages
                await connection.execute('DELETE FROM offline_messages WHERE sender = ? OR receiver = ?', [uid, uid]);
                
                // Set user as unlisted
                await connection.execute('UPDATE users SET listed = 0 WHERE uid = ?', [uid]);
                
                await connection.commit();
                connection.release();
                
                logger.info('User soft deleted successfully', { uid });
                return true;
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
        } catch (error) {
            logger.error('Error soft deleting user', { error: error.message, uid });
            throw error;
        }
    }

    /**
     * Get users with specific buddy
     */
    async getUsersWithBuddy(buddyUid) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT uid, nickname FROM users WHERE FIND_IN_SET(?, buddies) > 0',
                [buddyUid]
            );
            return rows;
        } catch (error) {
            logger.error('Error getting users with buddy', { error: error.message, buddyUid });
            throw error;
        }
    }

    /**
     * Get all listed users
     */
    async getAllUsers() {
        try {
            const [rows] = await this.pool.execute(
                'SELECT uid, nickname, admin, listed, created as regtime, color FROM users WHERE listed = 1 ORDER BY nickname'
            );
            return rows;
        } catch (error) {
            logger.error('Error getting all users', { error: error.message });
            throw error;
        }
    }

    /**
     * Get offline messages for user
     */
    async getOfflineMessages(uid) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT id, sender, msg as message, sent as timestamp FROM offline_messages WHERE receiver = ? ORDER BY sent ASC',
                [uid]
            );
            return rows;
        } catch (error) {
            logger.error('Error getting offline messages', { error: error.message, uid });
            throw error;
        }
    }

    /**
     * Store offline message
     */
    async storeOfflineMessage(senderUid, receiverUid, message) {
        try {
            const [result] = await this.pool.execute(
                'INSERT INTO offline_messages (sender, receiver, msg) VALUES (?, ?, ?)',
                [senderUid, receiverUid, message]
            );
            
            logger.info('Offline message stored', { 
                id: result.insertId, 
                sender: senderUid, 
                receiver: receiverUid 
            });
            
            return result.insertId;
        } catch (error) {
            logger.error('Error storing offline message', { 
                error: error.message, 
                sender: senderUid, 
                receiver: receiverUid 
            });
            throw error;
        }
    }

    /**
     * Mark messages as sent
     */
    async markMessagesAsSent(messageIds) {
        try {
            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return;
            }
            
            const placeholders = messageIds.map(() => '?').join(',');
            const query = `DELETE FROM offline_messages WHERE id IN (${placeholders})`;
            
            const [result] = await this.pool.execute(query, messageIds);
            
            logger.info('Messages marked as sent', { 
                count: result.affectedRows,
                messageIds: messageIds.slice(0, 5) // Log first 5 IDs to avoid spam
            });
            
            return result;
        } catch (error) {
            logger.error('Error marking messages as sent', { error: error.message, messageIds });
            throw error;
        }
    }

    /**
     * Log bounce action
     */
    async logBounce(bouncerUid, bounceeUid, roomId, reason = '') {
        try {
            const [result] = await this.pool.execute(
                'INSERT INTO bounce_logs (bouncer_uid, bouncee_uid, room_id, bounce_time, reason) VALUES (?, ?, ?, NOW(), ?)',
                [bouncerUid, bounceeUid, roomId, reason]
            );
            
            logger.info('Bounce logged', { 
                id: result.insertId,
                bouncer: bouncerUid,
                bouncee: bounceeUid,
                room: roomId
            });
            
            return result.insertId;
        } catch (error) {
            logger.error('Error logging bounce', { 
                error: error.message,
                bouncer: bouncerUid,
                bouncee: bounceeUid,
                room: roomId
            });
            throw error;
        }
    }

    /**
     * Get room by ID
     */
    async getRoomById(roomId) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT id, nm as name, topic, catg as category, r as type, v as voice, p as private, l as locked, isClosed, password, mike, text, color FROM `groups` WHERE id = ?',
                [roomId]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error getting room by ID', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Update room
     */
    async updateRoom(roomId, updateData) {
        try {
            const fields = [];
            const values = [];
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });
            
            values.push(roomId);
            
            if (fields.length === 0) {
                logger.warn('No fields to update for room', { roomId });
                return;
            }
            
            const sql = `UPDATE \`groups\` SET ${fields.join(', ')} WHERE id = ?`;
            
            const [result] = await this.pool.execute(sql, values);
            
            if (result.affectedRows > 0) {
                logger.info('Room updated successfully', { roomId, updateData });
            } else {
                logger.warn('No room found to update', { roomId });
            }
            
            return result;
        } catch (error) {
            logger.error('Error updating room', { error: error.message, roomId, updateData });
            throw error;
        }
    }

    /**
     * Get all rooms
     */
    async getAllRooms() {
        try {
            const [rows] = await this.pool.execute(
                'SELECT id, nm as name, topic, catg as category, r as type, v as voice, p as private, l as locked, isClosed, password, mike, text, color FROM `groups` ORDER BY id'
            );
            return rows;
        } catch (error) {
            logger.error('Error getting all rooms', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all categories
     */
    async getCategories() {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM categories ORDER BY code'
            );
            return rows;
        } catch (error) {
            logger.error('Error getting categories', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all groups
     */
    async getGroups() {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM `groups` ORDER BY id'
            );
            return rows;
        } catch (error) {
            logger.error('Error getting groups', { error: error.message });
            throw error;
        }
    }

    /**
     * Get permanent rooms
     */
    async getPermanentRooms() {
        try {
            // Get all rooms from the groups table (they are all permanent database rooms)
            const [rows] = await this.pool.execute(
                'SELECT id, nm as name, topic, catg as category, r as type, v as voice, p as private, l as locked, isClosed, password, mike, text, video, owner, cr FROM `groups` ORDER BY id'
            );
            
            logger.info('Loading permanent rooms from database', { count: rows.length });
            
            return rows;
        } catch (error) {
            logger.error('Error getting permanent rooms', { error: error.message });
            throw error;
        }
    }

    /**
     * Health check for database connection
     */
    async healthCheck() {
        try {
            if (!this.isConnected || !this.pool) {
                logger.warn('Database health check failed - not connected');
                return false;
            }

            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            this.lastHealthCheck = Date.now();
            logger.debug('Database health check passed');
            return true;
        } catch (error) {
            logger.error('Database health check failed', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get connection status
     */
    isHealthy() {
        return this.isConnected && this.pool !== null;
    }

    /**
     * Close database connection
     */
    async close() {
        try {
            if (this.pool) {
                await this.pool.end();
                this.isConnected = false;
                logger.info('MySQL database connection closed');
            }
        } catch (error) {
            logger.error('Error closing MySQL database connection', error);
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            isConnected: this.isConnected,
            lastHealthCheck: this.lastHealthCheck,
            queryHistorySize: this.queryHistory.length
        };
    }
}

module.exports = MySQLDatabaseManager;