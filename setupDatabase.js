const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("chat_app.db", err => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        uid INTEGER PRIMARY KEY,
        nickname TEXT,
        firstname TEXT,
        lastname TEXT,
        email TEXT,
        paid INTEGER,
        plus INTEGER,
        admin INTEGER,
        password TEXT,
        lastLogin TEXT,
        color TEXT,
        buddies TEXT,
        blocked TEXT,
        listed INTEGER
      )`, err => {
      if (err) {
        console.error("Error creating users table:", err.message);
        return db.run("ROLLBACK", () => db.close());
      }

      const stmt = db.prepare(`
        INSERT INTO users (uid, nickname, firstname, lastname, email, paid, plus, admin, password, lastLogin, color, buddies, blocked, listed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, err => {
        if (err) {
          console.error("Error preparing insert statement for users:", err.message);
          return db.run("ROLLBACK", () => db.close());
        }

        const users = [
          [1000001, 'Paltalk', 'Default', 'User', 'default@example.com', 1, 1, 1,'default_password_hash', new Date().toISOString(), '000000128', '', '', 0],
          [1000002, 'NetStorm', 'Default', 'User', 'default@example.com', 1, 1, 0,'default_password_hash', new Date().toISOString(), '000128000', '[{"uid": 1000001, "nickname": "Paltalk"}]', '', 1],
          [1000003, 'Medianoche (co-admin)', 'Median', 'Oche', 'medianoche@example.com', 1, 1, 1, 'another_password_hash', new Date().toISOString(), '128000000', '[]', '', 1]
        ];
        users.forEach(user => {
          stmt.run(user, err => {
            if (err) {
              console.error("Error inserting user:", err.message);
            }
          });
        });
        stmt.finalize();
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS offline_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender INTEGER,
          receiver INTEGER,
          sent TEXT,
          status TEXT,
          content TEXT
        )`, err => {
        if (err) {
          console.error("Error creating offline_messages table:", err.message);
          return db.run("ROLLBACK", () => db.close());
        }

        db.run(`
          INSERT INTO offline_messages (sender, receiver, sent, status, content) 
          VALUES (?, ?, ?, ?, ?)`, 
          [1000001, 1000002, new Date().toISOString(), "pending", "Welcome :)"], err => {
          if (err) {
            console.error("Error inserting offline message:", err.message);
          }
        });
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          uid INTEGER PRIMARY KEY,
          name TEXT,
          created TEXT,
          color TEXT,
          rating TEXT,
          locked INTEGER,
          voice INTEGER,
          owner_uid INTEGER,
          status_message TEXT,
          welcome_message TEXT
        )`, err => {
        if (err) {
          console.error("Error creating groups table:", err.message);
          return db.run("ROLLBACK", () => db.close());
        }

        const groupStmt = db.prepare(`
          INSERT INTO groups (uid, name, created, color, rating, locked, voice, owner_uid, status_message, welcome_message) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const groups = [
          [50001, '*** The Royal Oak ***', new Date().toISOString(), '000000000', 'G', 0, 1, 10000002, 'Please support our sponsors.', 'Welcome MOFOS'],
          [50002, '*** The White Horse ***', new Date().toISOString(), '000000000', 'G', 0, 1, 10000002, 'Please support our sponsors.', 'Welcome MOFOS'],
          [50003, '*** The Tuck INN ***', new Date().toISOString(), '000000000', 'G', 0, 1, 10000002, 'Please support our sponsors.', 'Welcome MOFOS'],
          [50004, '*** The Quiet Side ***', new Date().toISOString(), '000000000', 'G', 0, 0, 10000002, 'Please support our sponsors.', 'Welcome MOFOS']
        ];
        groups.forEach(group => {
          groupStmt.run(group, err => {
            if (err) {
              console.error("Error inserting group:", err.message);
            }
          });
        });
        groupStmt.finalize();

        db.run("COMMIT", err => {
          if (err) {
            console.error("Error on committing transaction:", err.message);
            return db.run("ROLLBACK", () => db.close());
          }
          console.log("All operations completed successfully.");
          db.close(); // Correct place to close the database connection
        });
      });
    });
  });
});
