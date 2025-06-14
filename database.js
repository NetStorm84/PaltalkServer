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
      uid                           INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname                      TEXT NOT NULL COLLATE NOCASE UNIQUE,
      email                         TEXT NOT NULL COLLATE NOCASE,
      first                         TEXT NOT NULL DEFAULT '',
      last                          TEXT NOT NULL DEFAULT '',
      privacy                       TEXT NOT NULL DEFAULT 'A', -- A,T,P
      verified                      INTEGER NOT NULL DEFAULT 0,
      random                        TEXT NOT NULL DEFAULT 0,
      paid1                         TEXT NOT NULL DEFAULT 'N', -- Y,6,E
      get_offers_from_us            TEXT NOT NULL DEFAULT 1,
      get_offers_from_affiliates    TEXT NOT NULL DEFAULT 1,
      banners                       TEXT NOT NULL DEFAULT 'yes', -- yes,no
      admin                         INTEGER NOT NULL DEFAULT 0,
      sup                           INTEGER NOT NULL DEFAULT 0,
      created                       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login                    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      listed                        INTEGER NOT NULL DEFAULT 1,
      buddies                       TEXT NOT NULL DEFAULT '',
      blocked                       TEXT NOT NULL DEFAULT '',
      color                         TEXT NOT NULL DEFAULT '000000000',
      password                      TEXT NOT NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS offline_messages (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      sender                INTEGER NOT NULL,
      receiver              INTEGER NOT NULL,
      sent                  TEXT DEFAULT CURRENT_TIMESTAMP,
      status                TEXT NOT NULL DEFAULT 'pending',
      content               TEXT NOT NULL DEFAULT ''
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS categories (
      code                  INTEGER PRIMARY KEY AUTOINCREMENT,
      value                 TEXT NOT NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS groups (
      id                    INTEGER PRIMARY KEY,
      catg                  INTEGER REFERENCES categories(code),
      r                     TEXT NOT NULL DEFAULT 'G',
      v                     INTEGER NOT NULL DEFAULT 1, -- voice
      p                     INTEGER NOT NULL DEFAULT 0, -- private
      password              TEXT NOT NULL DEFAULT '',
      l                     INTEGER NOT NULL DEFAULT 0, -- locked
      c                     TEXT NOT NULL DEFAULT '000000000', -- color rrrgggbbb
      nm                    TEXT, -- name
      mike                  INTEGER NOT NULL DEFAULT 0,
      text                  INTEGER NOT NULL DEFAULT 0,
      video                 INTEGER NOT NULL DEFAULT 0,
      created               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      owner                 INTEGER REFERENCES users(uid) DEFAULT 0,
      topic                 TEXT DEFAULT 'Please support our sponsors.'
    )
    `,
  ];

  // Define insert statements and corresponding data
  const insertStatements = [
    {
      sql: `
        INSERT INTO users (uid, nickname, email, paid1, banners, admin, password, color, buddies, blocked, listed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      data: [
        [1000001, "Paltalk", "default@example.com", 'Y', 'no', 2, "default_password_hash", "000000128", "", "", 0],
        [1000002, "NetStorm", "default@example.com", '6', 'no', 0, "default_password_hash", "000128000", '[{"uid": 1000001, "nickname": "Paltalk"}]', "", 1],
        [1000003, "Medianoche (co-admin)", "medianoche@example.com", 'Y' , 'no', 2, "another_password_hash", "128000000", "[]", "", 1],
        [1000004, "Dan", "dan@example.com", 'N', 'yes', 0, "another_password_hash", "000128000", "[]", "", 1],
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
        INSERT INTO groups (id, catg, nm, owner, v, r, l, password) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      data: [
        [50001, 30018, "*** The Royal Oak ***", 1000002, 1, 'G', 0, ''],
        [50002, 30018, "*** The White Horse ***", 0, 1, 'G', 0, ''],
        [50003, 30018, "*** The Tuck INN ***", 0, 1, 'A', 0, ''],
        [50004, 30027, "*** The Quiet Side ***", 0, 0, 'A', 0, ''],
        [50005, 30003, "Paltalk Help Lobby 1", 0, 1, 'G', 0, ''],
        [50006, 30003, "Paltalk Tech Support 1", 0, 1, 'G', 0, ''],
        [50007, 30003, "Paltalk Tech Support 2", 0, 1, 'G', 0, ''],
        [50008, 30003, "--- Paltalk Support Online ---", 0, 0, 'G', 1, 'support'],
        
        // ** DIVERSE ROOM COLLECTION - 30 ROOMS **
        
        // TOP ROOMS (30001)
        [60001, 30001, "The Main Event", 0, 1, 'G', 0, ''],
        [60002, 30001, "VIP Lounge", 0, 1, 'A', 1, 'exclusive'],
        [60003, 30001, "Comedy Central", 0, 1, 'G', 0, ''],
        
        // FEATURED ROOMS (30002)
        [60004, 30002, "Weekend Warriors", 0, 1, 'A', 0, ''],
        [60005, 30002, "Secret Garden", 0, 0, 'G', 1, 'flowers'],
        
        // MEET NEW FRIENDS (30006)
        [60006, 30006, "Global Connections", 0, 1, 'G', 0, ''],
        [60007, 30006, "Coffee Chat", 0, 0, 'G', 0, ''],
        [60008, 30006, "Midnight Express", 0, 1, 'A', 0, ''],
        [60009, 30006, "Friendship Circle", 0, 1, 'G', 0, ''],
        
        // LOVE AND ROMANCE (30007)
        [60010, 30007, "Cupid's Corner", 0, 1, 'A', 0, ''],
        [60011, 30007, "Sweet Dreams", 0, 0, 'A', 1, 'romance'],
        [60012, 30007, "Hearts & Souls", 0, 1, 'A', 0, ''],
        
        // SOCIAL ISSUES (30008)
        [60013, 30008, "Current Events Hub", 0, 1, 'G', 0, ''],
        [60014, 30008, "Debate Arena", 0, 1, 'A', 0, ''],
        [60015, 30008, "Community Voice", 0, 0, 'G', 0, ''],
        
        // LANGUAGE ROOMS - EUROPE (30009)
        [60016, 30009, "Bonjour France", 0, 1, 'G', 0, ''],
        [60017, 30009, "Ciao Italia", 0, 1, 'G', 0, ''],
        [60018, 30009, "Guten Tag Deutschland", 0, 0, 'G', 0, ''],
        
        // LANGUAGE ROOMS - SPANISH & PORTUGUESE (30011)
        [60019, 30011, "Hola España", 0, 1, 'G', 0, ''],
        [60020, 30011, "Brasil Brasileiro", 0, 1, 'A', 0, ''],
        [60021, 30011, "México Lindo", 0, 0, 'G', 0, ''],
        
        // YOUNG ADULTS (30018)
        [60022, 30018, "Campus Life", 0, 1, 'A', 0, ''],
        [60023, 30018, "Party Zone", 0, 1, 'A', 1, 'party2024'],
        [60024, 30018, "Study Buddies", 0, 0, 'G', 0, ''],
        
        // RELIGIOUS (30019)
        [60025, 30019, "Faith & Fellowship", 0, 1, 'G', 0, ''],
        [60026, 30019, "Prayer Circle", 0, 0, 'G', 0, ''],
        
        // COMPUTERS - HI TECH (30024)
        [60027, 30024, "Geek Squad", 0, 1, 'G', 0, ''],
        [60028, 30024, "AI Revolution", 0, 0, 'A', 1, 'tech2024'],
        
        // SPORTS AND HOBBIES (30025)
        [60029, 30025, "Sports Fanatics", 0, 1, 'A', 0, ''],
        [60030, 30025, "Gaming Paradise", 0, 1, 'A', 0, ''],
        
        // MUSIC (30027)
        [60031, 30027, "Rock Legends", 0, 1, 'A', 0, ''],
        [60032, 30027, "Jazz Lounge", 0, 0, 'G', 0, ''],
        
        // MISCELLANEOUS (30028)
        [60033, 30028, "Random Thoughts", 0, 1, 'G', 0, ''],
        [60034, 30028, "Late Night Diner", 0, 0, 'A', 0, ''],
        
        // ADULT ORIENTED (30029)
        [60035, 30029, "Adults Only", 0, 1, 'R', 1, 'adults'],
        [60036, 30029, "Mature Discussions", 0, 0, 'A', 0, ''],
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
