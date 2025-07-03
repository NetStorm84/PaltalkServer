const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());

// Database setup - use main database
const dbPath = path.join(__dirname, '../../../h2ktalk-web/database/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first TEXT NOT NULL,
        last TEXT NOT NULL,
        nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1,
        failed_attempts INTEGER DEFAULT 0,
        lockout_until TEXT DEFAULT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS email_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        ip_address TEXT DEFAULT NULL,
        user_agent TEXT DEFAULT NULL
    )`);
});

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { first, last, nickname, password } = req.body;

        if (!first || !last || !nickname || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate nickname
        if (nickname.length < 5) {
            return res.status(400).json({ error: 'Nickname must be at least 5 characters long' });
        }

        // Check blacklisted words
        const blacklistedWords = ['admin', 'co-admin', 'coadmin', 'paltalk', 'support', 'palsupport'];
        const nicknameLC = nickname.toLowerCase();
        
        for (const word of blacklistedWords) {
            if (nicknameLC.includes(word)) {
                return res.status(400).json({ error: `Nickname cannot contain the word "${word}"` });
            }
        }

        // Check for brackets
        if (nickname.includes('(') || nickname.includes(')')) {
            return res.status(400).json({ error: 'Nickname cannot contain brackets ( )' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        db.run(
            'INSERT INTO users (first, last, nickname, password) VALUES (?, ?, ?, ?)',
            [first, last, nickname, hashedPassword],
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        return res.status(400).json({ error: 'Nickname already exists' });
                    }
                    console.error('Registration error:', err);
                    return res.status(500).json({ error: 'Registration failed' });
                }
                res.json({ success: true, message: 'Registration successful' });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/check-nickname', (req, res) => {
    const { nickname } = req.body;
    
    db.get('SELECT id FROM users WHERE nickname = ? COLLATE NOCASE', [nickname], (err, row) => {
        if (err) {
            console.error('Nickname check error:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.json({ exists: !!row });
    });
});

app.post('/api/notify-signup', (req, res) => {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    db.run(
        'INSERT INTO email_notifications (email, ip_address, user_agent) VALUES (?, ?, ?)',
        [email, ip, userAgent],
        function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ error: 'Email already registered for notifications' });
                }
                console.error('Email signup error:', err);
                return res.status(500).json({ error: 'Signup failed' });
            }
            res.json({ success: true, message: 'Email notification signup successful' });
        }
    );
});

app.get('/api/stats', (req, res) => {
    res.json({
        server: 'h2ktalk.fun',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;