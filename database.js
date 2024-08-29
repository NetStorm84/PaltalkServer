const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }

  // Declare all SQL create table statements
  const sqlStatements = [
    `
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
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS offline_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER,
      receiver INTEGER,
      sent TEXT,
      status TEXT,
      content TEXT
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS categories (
      code INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS groups (
      id                    INTEGER PRIMARY KEY,
      catg                  INTEGER REFERENCES categories(code),
      r                     TEXT NOT NULL DEFAULT 'G',
      v                     INTEGER NOT NULL DEFAULT 1,
      p                     INTEGER NOT NULL DEFAULT 0,
      l                     INTEGER NOT NULL DEFAULT 0,
      c                     INTEGER NOT NULL DEFAULT '000000000', -- color rrrgggbbb
      nm                    TEXT,
      mike                  INTEGER NOT NULL DEFAULT 0,
      text                  INTEGER NOT NULL DEFAULT 0,
      video                 INTEGER NOT NULL DEFAULT 0,
      created               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      owner                 INTEGER REFERENCES users(uid) DEFAULT 0,
      topic                 TEXT DEFAULT 'Please Support Our Sponsors.'
    )
    `,
  ];

  // Define insert statements and corresponding data
  const insertStatements = [
    {
      sql: `
        INSERT INTO users (uid, nickname, firstname, lastname, email, paid, plus, admin, password, lastLogin, color, buddies, blocked, listed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      data: [
        [1000001, "Paltalk", "Default", "User", "default@example.com", 1, 1, 1, "default_password_hash", new Date().toISOString(), "000000128", "", "", 0],
        [1000002, "NetStorm", "Default", "User", "default@example.com", 1, 1, 0, "default_password_hash", new Date().toISOString(), "000128000", '[{"uid": 1000001, "nickname": "Paltalk"}]', "", 1],
        [1000003, "Medianoche (co-admin)", "Median", "Oche", "medianoche@example.com", 1, 1, 1, "another_password_hash", new Date().toISOString(), "128000000", "[]", "", 1],
        [1000004, "Dan", "Dan", "", "dan@example.com", 1, 1, 0, "another_password_hash", new Date().toISOString(), "000128000", "[]", "", 1],
      ],
    },
    {
      sql: `
        INSERT INTO offline_messages (sender, receiver, sent, status, content) 
        VALUES (?, ?, ?, ?, ?)
      `,
      data: [
        [1000001, 1000002, new Date().toISOString(), "pending", "Welcome :)"],
      ],
    },
    {
        sql: `
          INSERT INTO categories (code, value) 
          VALUES (?, ?)
        `,
        data: [
          [30001, "Top Rooms"],
          [30002, "Featured Rooms"],
          [30003, "Paltalk Help Rooms"],
          [30004, "Paltalk Radio"],
          [30005, "Distance Learning"],
          [30006, "Meet New Friends"],
          [30007, "Love and Romance"],
          [30008, "Social Issues"],
          [30009, "By Language: Europe"],
          [30010, "By Language: Arabic"],
          [30011, "By Language: Spanish & Portuguese"],
          [30012, "By Language: Asia & The Far East"],
          [30013, "By Language: Middle East"],
          [30014, "By Language: India & Pakistan"],
          [30015, "By Language / Nationality / Other"],
          [30016, "Welcome Brazil"],
          [30017, "Early Teens (13 - 17 ONLY) - NO ADULTS"],
          [30018, "Young Adults (18+)"],
          [30019, "Religious"],
          [30020, "Christianity"],
          [30021, "Islam"],
          [30022, "Judaism"],
          [30023, "Health Related / Parenting"],
          [30024, "Computers - Hi Tech"],
          [30025, "Sports and Hobbies"],
          [30026, "Business and Finance"],
          [30027, "Music"],
          [30028, "Miscellaneous"],
          [30029, "Adult Oriented"],
        ],
      },      
    {
      sql: `
        INSERT INTO groups (id, catg, nm, owner) 
        VALUES (?, ?, ?, ?)
      `,
      data: [
        [50001, 30018, "*** The Royal Oak ***", 1000002],
        [50002, 30018, "*** The White Horse ***", 0],
        [50003, 30018, "*** The Tuck INN ***", 0],
        [50004, 30027, "*** The Quiet Side ***", 0],
      ],
    },
  ];

  // Function to run all SQL create table statements
  function runSQLStatements(statements, callback) {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) return callback(err);

        statements.forEach((sql, index) => {
          db.run(sql, (err) => {
            if (err) {
              console.error(`Error running statement #${index + 1}:`, err.message);
              return db.run("ROLLBACK", () => callback(err));
            }
          });
        });

        db.run("COMMIT", (err) => {
          if (err) {
            console.error("Error on committing transaction:", err.message);
            return db.run("ROLLBACK", () => callback(err));
          }
          callback(null);
        });
      });
    });
  }

  // Function to insert initial data
  function insertInitialData(statements, callback) {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) return callback(err);

        statements.forEach(({ sql, data }, index) => {
          const stmt = db.prepare(sql, handleError(`preparing insert statement #${index + 1}`, callback));
          data.forEach((row) => stmt.run(row, handleError(`inserting data for statement #${index + 1}`, callback)));
          stmt.finalize();
        });

        db.run("COMMIT", (err) => {
          if (err) {
            console.error("Error on committing transaction:", err.message);
            return db.run("ROLLBACK", () => callback(err));
          }
          callback(null);
        });
      });
    });
  }

  // Function to handle errors
  function handleError(operation, callback) {
    return (err) => {
      if (err) {
        console.error(`Error ${operation}:`, err.message);
        db.run("ROLLBACK", () => {
          db.close();
          callback(err);
        });
      }
    };
  }

  // Main execution flow
  runSQLStatements(sqlStatements, (err) => {
    if (err) {
      console.error("Failed to run SQL statements:", err.message);
      return;
    }

    insertInitialData(insertStatements, (err) => {
      if (err) {
        console.error("Failed to insert initial data:", err.message);
        return;
      }

      console.log("All operations completed successfully.");
      db.close();
    });
  });
});
