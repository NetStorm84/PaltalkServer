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
     * Convert decimal to hexadecimal (padded to 8 characters)
     * @param {number} decimal 
     * @returns {string}
     */
    static decToHex(decimal) {
        return parseInt(decimal).toString(16).padStart(8, '0');
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
        return ip.split('.').map(octet => 
            parseInt(octet).toString(16).padStart(2, '0')
        ).join('');
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
}

module.exports = Utils;
