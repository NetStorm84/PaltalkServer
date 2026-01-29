/**
 * Utility functions for the Paltalk server
 */

class Utils {
    /**
     * Convert hexadecimal to decimal
     * @param {string|Buffer} hex 
     * @returns {number}
     */
    static hexToDec(hex) {
        return parseInt(hex.toString('hex'), 16);
    }

    /**
     * Convert decimal to hexadecimal (padded to specified bytes)
     * @param {number} decimal 
     * @param {number} bytes - Number of bytes to pad to (default 4 for 8 hex chars)
     * @returns {string}
     */
    static decToHex(decimal, bytes = 4) {
        const hexChars = bytes * 2;
        return parseInt(decimal).toString(16).padStart(hexChars, '0');
    }

    /**
     * Convert hexadecimal to ASCII (with filtering)
     * @param {Buffer} hex 
     * @returns {string}
     */
    static hexToAscii(hex) {
        return hex.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
    }

    /**
     * Convert ASCII string to hexadecimal
     * @param {string} str 
     * @returns {string}
     */
    static asciiToHex(str) {
        let hex = '';
        for (let i = 0; i < str.length; i++) {
            hex += str.charCodeAt(i).toString(16);
        }
        return hex;
    }

    /**
     * Extract IPv4 address from IPv6-mapped address
     * @param {string} address 
     * @returns {string}
     */
    static extractIPv4(address) {
        return address.includes('::ffff:') ? address.split(':').pop() : address;
    }

    /**
     * Convert IP address to hexadecimal format
     * @param {string} ip 
     * @returns {string}
     */
    static ipToHex(ip) {
        if (!ip || typeof ip !== 'string') {
            throw new Error(`Invalid IP address: ${ip}`);
        }
        
        const parts = ip.split('.');
        if (parts.length !== 4) {
            throw new Error(`Invalid IP address format: ${ip}`);
        }
        
        return parts.map(octet => {
            const num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                throw new Error(`Invalid IP octet: ${octet} in IP ${ip}`);
            }
            return num.toString(16).padStart(2, '0');
        }).join('');
    }

    /**
     * Parse key-value pairs from string (format: key=value\nkey=value)
     * @param {string} input 
     * @param {string} key 
     * @returns {string|undefined}
     */
    static getValueByKey(input, key) {
        const pairs = input.split('\n');
        for (let pair of pairs) {
            const [currentKey, value] = pair.split('=');
            if (currentKey === key) {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Convert object to Paltalk's key=value format
     * @param {Object} obj 
     * @returns {string}
     */
    static objectToKeyValueString(obj) {
        return Object.entries(obj).map(([key, value]) => `${key}=${value}`).join('\n');
    }

    /**
     * Create a hex dump of buffer data for debugging
     * @param {Buffer} buffer 
     * @returns {string}
     */
    static hexDump(buffer) {
        const lines = [];
        const length = buffer.length;
        
        for (let i = 0; i < length; i += 16) {
            const slice = buffer.slice(i, i + 16);
            const hex = slice.toString('hex').match(/.{1,2}/g).join(' ');
            const ascii = slice.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
            const offset = i.toString(16).padStart(8, '0');
            lines.push(`${offset}  ${hex.padEnd(48, ' ')}  ${ascii}`);
        }
        
        return lines.join('\n');
    }

    /**
     * Validate user input for security
     * @param {string} input 
     * @param {number} maxLength 
     * @returns {boolean}
     */
    static isValidInput(input, maxLength = 255) {
        if (!input || typeof input !== 'string') return false;
        if (input.length > maxLength) return false;
        // Basic sanitization - no control characters except newline and tab
        return !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input);
    }

    /**
     * Enhanced input sanitization for chat messages
     * @param {string} input 
     * @param {number} maxLength 
     * @returns {string|null}
     */
    static sanitizeChatMessage(input, maxLength = 1000) {
        if (!input || typeof input !== 'string') return null;
        
        // Trim whitespace
        input = input.trim();
        
        // Check length
        if (input.length === 0 || input.length > maxLength) return null;
        
        // Remove control characters except newline and tab
        input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Basic HTML/script injection prevention
        input = input.replace(/<[^>]*>/g, '');
        
        return input;
    }

    /**
     * Validate nickname format
     * @param {string} nickname 
     * @returns {boolean}
     */
    static isValidNickname(nickname) {
        if (!nickname || typeof nickname !== 'string') return false;
        if (nickname.length < 2 || nickname.length > 32) return false;
        
        // Allow alphanumeric, spaces, basic punctuation
        return /^[a-zA-Z0-9\s\-_\.]+$/.test(nickname);
    }

    /**
     * Validate room name format
     * @param {string} roomName 
     * @returns {boolean}
     */
    static isValidRoomName(roomName) {
        if (!roomName || typeof roomName !== 'string') return false;
        if (roomName.length < 1 || roomName.length > 64) return false;
        
        // More restrictive than nicknames
        return /^[a-zA-Z0-9\s\-_\.\(\)\[\]]+$/.test(roomName);
    }

    /**
     * Rate limiting helper
     * @param {string} identifier 
     * @param {number} maxRequests 
     * @param {number} windowMs 
     * @returns {boolean}
     */
    static checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
        if (!this.rateLimitMap) {
            this.rateLimitMap = new Map();
        }

        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.rateLimitMap.has(identifier)) {
            this.rateLimitMap.set(identifier, []);
        }
        
        const requests = this.rateLimitMap.get(identifier);
        
        // Remove old requests
        while (requests.length > 0 && requests[0] < windowStart) {
            requests.shift();
        }
        
        // Check if under limit
        if (requests.length >= maxRequests) {
            return false;
        }
        
        // Add current request
        requests.push(now);
        return true;
    }

    /**
     * Generate a unique session ID
     * @returns {string}
     */
    static generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Safely parse JSON with fallback
     * @param {string} jsonString 
     * @param {*} fallback 
     * @returns {*}
     */
    static safeJsonParse(jsonString, fallback = {}) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return fallback;
        }
    }

    // =========================================================================
    // PASSWORD ENCRYPTION/DECRYPTION
    // =========================================================================
    //
    // Paltalk Password Encryption Protocol:
    //
    // 1. SERVER CHALLENGE:
    //    - Server sends a challenge string (e.g., "XyF¦519") with SERVER_KEY packet
    //    - IMPORTANT: Must use Latin-1 encoding (not UTF-8) so '¦' is 1 byte (0xA6)
    //    - Client extracts bytes 4-6 and calculates: SERVER_KEY = atoi(bytes[4:7]) - 509
    //    - Example: "519" -> SERVER_KEY = 519 - 509 = 10
    //
    // 2. ENCRYPTION FORMULA (client-side):
    //    For each character at position i:
    //      encrypted[i] = plain[i] + GINGER_KEY[(SERVER_KEY + i) % 51] + (13 - i) * i + 0x7A
    //
    // 3. OUTPUT FORMAT:
    //    - Each encrypted value is formatted as 3-digit decimal (zero-padded) + 1 random noise digit
    //    - Example: value 266 with noise 7 -> "2667"
    //    - Total output length = password.length * 4
    //
    // 4. DECRYPTION FORMULA (server-side):
    //    For each 4-char block at position i:
    //      plain[i] = parseInt(block[0:3]) - GINGER_KEY[(SERVER_KEY + i) % 51] - (13 - i) * i - 0x7A
    //    (4th char is noise, ignored)
    //
    // =========================================================================

    /**
     * GINGER_KEY - The 51-character key used for password encryption/decryption
     * Used as a rotating cipher key based on SERVER_KEY offset
     */
    static GINGER_KEY = "Ginger was a big fat horse, a big fat horse was she";

    /**
     * Decrypt a Paltalk encrypted password
     *
     * @param {string} encryptedStr - The encrypted password string
     *                                Format: 4 chars per original char (3-digit value + 1 noise digit)
     *                                Example: "26673281291536513828376031033668" (8 chars = 32 encrypted chars)
     * @param {number} serverKey - The SERVER_KEY value (derived from challenge: atoi(payload[4:7]) - 509)
     *                             Default: 0 (though server should always provide this)
     * @returns {string} The decrypted plaintext password
     *
     * @example
     * // With SERVER_KEY = 10 and encrypted "password":
     * decryptPassword("26673281291536513828376031033668", 10) // Returns "password"
     */
    static decryptPassword(encryptedStr, serverKey = 0) {
        const decryptedChars = [];

        for (let i = 0; i < encryptedStr.length; i += 4) {
            // Extract 3-digit encrypted value (ignore 4th noise digit)
            const encryptedValue = parseInt(encryptedStr.substring(i, i + 3), 10);
            const position = i / 4;

            // Get key character at rotating position
            const keyIndex = (serverKey + position) % 51;
            const keyCharCode = this.GINGER_KEY.charCodeAt(keyIndex);

            // Reverse encryption: plain = enc - key - positionFactor - 0x7A
            const positionFactor = (13 - position) * position;
            const decryptedCharCode = encryptedValue - keyCharCode - positionFactor - 0x7A;

            decryptedChars.push(String.fromCharCode(decryptedCharCode & 0xFF));
        }

        return decryptedChars.join('');
    }

    /**
     * Encrypt a password using Paltalk's algorithm
     *
     * @param {string} password - The plaintext password to encrypt
     * @param {number} serverKey - The SERVER_KEY value to use for encryption
     *                             Default: 0 (though should match server's challenge)
     * @returns {string} The encrypted password string
     *                   Format: 4 chars per original char (3-digit value + 1 noise digit)
     *
     * @example
     * // Encrypt "password" with SERVER_KEY = 10:
     * encryptPassword("password", 10) // Returns something like "26673281291536513828376031033668"
     */
    static encryptPassword(password, serverKey = 0) {
        let encryptedString = "";

        for (let i = 0; i < password.length; i++) {
            const plainCharCode = password.charCodeAt(i);

            // Get key character at rotating position
            const keyIndex = (serverKey + i) % 51;
            const keyCharCode = this.GINGER_KEY.charCodeAt(keyIndex);

            // Encryption: enc = plain + key + positionFactor + 0x7A
            const positionFactor = (13 - i) * i;
            const encryptedValue = plainCharCode + keyCharCode + positionFactor + 0x7A;

            // Format as 3-digit decimal + random noise digit
            const formatted = (encryptedValue % 1000).toString().padStart(3, '0');
            const noiseDigit = Math.floor(Math.random() * 10).toString();
            encryptedString += formatted + noiseDigit;
        }

        return encryptedString;
    }
}

module.exports = Utils;
