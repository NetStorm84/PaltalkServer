/**
 * Socket.IO client wrapper for h2ktalk admin interface
 * Connects to the Node.js server Socket.IO instance
 */

import { io } from 'socket.io-client';

class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.eventListeners = new Map();
        
        // Connection configuration
        this.config = {
            url: 'http://localhost:3000', // Node.js server Socket.IO port
            options: {
                autoConnect: false,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: this.maxReconnectAttempts,
                timeout: 5000,
                transports: ['websocket', 'polling']
            }
        };
    }

    /**
     * Initialize and connect to Socket.IO server
     */
    connect() {
        if (this.socket) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.config.url, this.config.options);
                
                this.socket.on('connect', () => {
                    console.log('✅ Socket.IO connected to Node.js server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connection-status', { connected: true });
                    resolve();
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('❌ Socket.IO disconnected:', reason);
                    this.isConnected = false;
                    this.emit('connection-status', { connected: false, reason });
                });

                this.socket.on('connect_error', (error) => {
                    console.error('🔥 Socket.IO connection error:', error);
                    this.reconnectAttempts++;
                    
                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.error('❌ Max reconnection attempts reached');
                        this.emit('connection-status', { connected: false, error: 'Max reconnection attempts reached' });
                        reject(error);
                    }
                });

                this.socket.on('reconnect', (attemptNumber) => {
                    console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connection-status', { connected: true, reconnected: true });
                });

                // Server-side event listeners
                this.setupServerEventListeners();

                // Try to connect
                this.socket.connect();

            } catch (error) {
                console.error('Failed to initialize Socket.IO:', error);
                reject(error);
            }
        });
    }

    /**
     * Set up listeners for server events
     */
    setupServerEventListeners() {
        if (!this.socket) return;

        // Real-time server updates
        this.socket.on('serverUpdate', (data) => {
            console.log('📊 Received serverUpdate:', data);
            this.emit('server-update', data);
        });

        // Real-time log updates
        this.socket.on('logsUpdate', (data) => {
            console.log('📋 Received logsUpdate:', data);
            this.emit('logs-update', data);
        });

        // Real-time packet logs
        this.socket.on('packetLogged', (data) => {
            console.log('📦 Received packetLogged:', data);
            this.emit('packet-logged', data);
        });

        // Bot updates
        this.socket.on('botUpdate', (data) => {
            console.log('🤖 Received botUpdate:', data);
            this.emit('bot-update', data);
        });

        // Voice server updates
        this.socket.on('voiceUpdate', (data) => {
            console.log('🎙️ Received voiceUpdate:', data);
            this.emit('voice-update', data);
        });

        // User events
        this.socket.on('userJoined', (data) => {
            console.log('👤 User joined:', data);
            this.emit('user-joined', data);
        });

        this.socket.on('userLeft', (data) => {
            console.log('👤 User left:', data);
            this.emit('user-left', data);
        });

        // Room events
        this.socket.on('roomUpdate', (data) => {
            console.log('🏠 Room update:', data);
            this.emit('room-update', data);
        });

        // Debug all Socket.IO events
        this.socket.onAny((eventName, ...args) => {
            console.log(`🔌 Socket event '${eventName}':`, args);
        });
    }

    /**
     * Disconnect from Socket.IO server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.emit('connection-status', { connected: false });
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to local listeners
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Send data to server via Socket.IO
     */
    send(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
            return true;
        } else {
            console.warn('Cannot send data: Socket.IO not connected');
            return false;
        }
    }

    /**
     * Request specific data from server
     */
    request(event, data = {}) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                reject(new Error('Socket.IO not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000); // 10 second timeout

            this.socket.emit(event, data, (response) => {
                clearTimeout(timeout);
                if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            socketId: this.socket ? this.socket.id : null
        };
    }

    /**
     * Update connection configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export singleton instance
const socketClient = new SocketClient();
export default socketClient;

// Also export the class for creating additional instances if needed
export { SocketClient };