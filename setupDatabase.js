const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('chat_app.db');

db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY,
    nickname TEXT,
    firstname TEXT,
    lastname TEXT,
    email TEXT,
    paid INTEGER,
    password TEXT,
    lastLogin TEXT,
    admin INTEGER,
    color TEXT,
    buddies TEXT,
    blocked TEXT,
    listed INTEGER
  )`);

  // Insert a default user
  db.run(`INSERT INTO users (uid, nickname, firstname, lastname, email, paid, password, lastLogin, admin, color, buddies, blocked, listed) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [1000002, 'NetStorm', 'Default', 'User', 'default@example.com', 1, 'default_password_hash', new Date().toISOString(), 1, '#FFFFFF', '[{"uid": 1000001, "nickname": "Paltalk"}]', '', 1], 
          (err) => {
            if (err) {
              return console.error('Error inserting default user:', err.message);
            }
            console.log('Default user added to the database.');
          });

  // Create offline_messages table
  db.run(`CREATE TABLE IF NOT EXISTS offline_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender INTEGER,
    receiver INTEGER,
    sent TEXT,
    status TEXT,
    content TEXT
  )`);

    // Insert an offline message
    db.run(`INSERT INTO offline_messages (sender, receiver, sent, status, content) 
      VALUES (?, ?, ?, ?, ?)`, 
      [1000001, 1000002, '2024-08-02T10:17:29.253Z', 'pending', 'Welcome :)'], 
      (err) => {
        if (err) {
          return console.error('Error inserting offline message', err.message);
        }
        console.log('Offline message added to the database.');
      });

  // Create rooms table
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY,
    category_id INTEGER,
    color TEXT,
    created TEXT,
    locked INTEGER,
    owner_uid INTEGER,
    name TEXT,
    voice INTEGER,
    welcome_message TEXT
  )`);

  // Create categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT,
    room_count INTEGER
  )`);

  // Create email_invites table
  db.run(`CREATE TABLE IF NOT EXISTS email_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    requestedAt TEXT,
    status TEXT
  )`);
});

db.close();
