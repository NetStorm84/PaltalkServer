const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat_app.db');

db.serialize(() => {
  // Start transaction
  db.run("BEGIN TRANSACTION");

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
  )`, err => {
    if (err) {
      console.error('Error creating users table:', err.message);
      db.run("ROLLBACK");
      return;
    }

    // Array of user data
    const users = [
      [1000001, 'Paltalk', 'Default', 'User', 'default@example.com', 1, 'default_password_hash', new Date().toISOString(), 1, '#FFFFFF', '', '', 0],
      [1000002, 'NetStorm', 'Default', 'User', 'default@example.com', 0, 'default_password_hash', new Date().toISOString(), 1, '#FFFFFF', '[{"uid": 1000001, "nickname": "Paltalk"}]', '', 1],
      [1000003, 'Medianoche (co-admin)', 'Median', 'Oche', 'medianoche@example.com', 1, 'another_password_hash', new Date().toISOString(), 0, '#000000', '[]', '', 0],
    ];

    // Insert users using a prepared statement
    const stmt = db.prepare(`INSERT INTO users (uid, nickname, firstname, lastname, email, paid, password, lastLogin, admin, color, buddies, blocked, listed) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const user of users) {
      stmt.run(user, (err) => {
        if (err) {
          console.error('Error inserting user:', err.message);
        }
      });
    }
    stmt.finalize();

    // Create offline_messages table and insert data
    db.run(`CREATE TABLE IF NOT EXISTS offline_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER,
      receiver INTEGER,
      sent TEXT,
      status TEXT,
      content TEXT
    )`, err => {
      if (err) {
        console.error('Error creating offline_messages table:', err.message);
        db.run("ROLLBACK");
        return;
      }

      // Insert an offline message
      db.run(`INSERT INTO offline_messages (sender, receiver, sent, status, content) 
            VALUES (?, ?, ?, ?, ?)`, 
            [1000001, 1000002, '2024-08-02T10:17:29.253Z', 'pending', 'Welcome :)'], 
            (err) => {
              if (err) {
                console.error('Error inserting offline message:', err.message);
              }
            });
    });

    // Create other tables as needed
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

    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT,
      room_count INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS email_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      requestedAt TEXT,
      status TEXT
    )`, err => {
      if (err) {
        console.error('Error creating email_invites table:', err.message);
        db.run("ROLLBACK");
        return;
      }

      // Commit transaction
      db.run("COMMIT", err => {
        if (err) {
          console.error('Error on committing transaction:', err.message);
          db.run("ROLLBACK");
        } else {
          console.log('All operations completed successfully.');
          db.close(); // Proper place to close the db connection
        }
      });
    });
  });
});
