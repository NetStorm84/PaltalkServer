const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }

  // Declare all SQL statements to drop and recreate tables
  const sqlStatements = [
    // Drop all tables first
    `DROP TABLE IF EXISTS groups`,
    `DROP TABLE IF EXISTS offline_messages`,
    `DROP TABLE IF EXISTS categories`, 
    `DROP TABLE IF EXISTS users`,
    
    // Then recreate tables
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
      sup                           INTEGER NOT NULL DEFAULT 0, --pal support?
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
      mike                  INTEGER NOT NULL DEFAULT 1,
      text                  INTEGER NOT NULL DEFAULT 0,
      video                 INTEGER NOT NULL DEFAULT 0,
      created               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      owner                 INTEGER REFERENCES users(uid) DEFAULT 0,
      cr                    TEXT NOT NULL DEFAULT '', -- creator UID
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
        // KEEP ORIGINAL 8 ROOMS
        [50001, 30018, "*** The Royal Oak ***", 1000002, 1, 'G', 0, ''],
        [50002, 30018, "*** The White Horse ***", 0, 1, 'G', 0, ''],
        [50003, 30018, "*** The Tuck INN ***", 0, 1, 'A', 0, ''],
        [50004, 30027, "*** The Quiet Side ***", 0, 0, 'A', 0, ''],
        [50005, 30003, "Paltalk Help Lobby 1", 0, 1, 'G', 0, ''],
        [50006, 30003, "Paltalk Tech Support 1", 0, 1, 'G', 0, ''],
        [50007, 30003, "Paltalk Tech Support 2", 0, 1, 'G', 0, ''],
        [50008, 30003, "--- Paltalk Support Online ---", 0, 0, 'G', 1, 'support'],
        
        // TOP ROOMS (30001) - No entries needed as this is populated dynamically
        
        // FEATURED ROOMS (30002) - 10 rooms
        [50009, 30002, "Weekend Warriors", 0, 1, 'G', 0, ''],
        [50010, 30002, "Special Events", 0, 1, 'G', 0, ''],
        [50011, 30002, "Spotlight Room", 0, 1, 'G', 0, ''],
        [50012, 30002, "Featured Discussion", 0, 0, 'G', 0, ''],
        [50013, 30002, "Highlighted Topics", 0, 1, 'G', 0, ''],
        [50014, 30002, "Weekly Showcase", 0, 1, 'G', 0, ''],
        [50015, 30002, "Recommended Chat", 0, 0, 'G', 0, ''],
        [50016, 30002, "Select Conversations", 0, 1, 'G', 0, ''],
        [50017, 30002, "Prime Discussion", 0, 1, 'G', 0, ''],
        [50018, 30002, "Choice Room", 0, 0, 'G', 0, ''],
        
        // PALTALK HELP ROOMS (30003) - 10 rooms (including original 4)
        [50019, 30003, "Paltalk Help Lobby 2", 0, 1, 'G', 0, ''],
        [50020, 30003, "New Users Help", 0, 1, 'G', 0, ''],
        [50021, 30003, "FAQ Discussion", 0, 0, 'G', 0, ''],
        [50022, 30003, "Account Support", 0, 1, 'G', 0, ''],
        [50023, 30003, "Technical Issues", 0, 1, 'G', 0, ''],
        [50024, 30003, "App Tips & Tricks", 0, 0, 'G', 0, ''],
        
        // PALTALK RADIO (30004) - 10 rooms
        [50025, 30004, "Music Station", 0, 1, 'G', 0, ''],
        [50026, 30004, "Talk Radio Central", 0, 1, 'G', 0, ''],
        [50027, 30004, "Podcast Hub", 0, 0, 'G', 0, ''],
        [50028, 30004, "Live DJ Sessions", 0, 1, 'G', 0, ''],
        [50029, 30004, "Audio Broadcast", 0, 1, 'G', 0, ''],
        [50030, 30004, "Radio Workshop", 0, 0, 'G', 0, ''],
        [50031, 30004, "Music Sharing", 0, 1, 'G', 0, ''],
        [50032, 30004, "Radio Discussions", 0, 1, 'G', 0, ''],
        [50033, 30004, "DJ Hangout", 0, 0, 'G', 0, ''],
        [50034, 30004, "Broadcast Central", 0, 1, 'G', 0, ''],
        
        // DISTANCE LEARNING (30005) - 10 rooms
        [50035, 30005, "Study Group", 0, 1, 'G', 0, ''],
        [50036, 30005, "Online Classes", 0, 1, 'G', 0, ''],
        [50037, 30005, "E-Learning Hub", 0, 0, 'G', 0, ''],
        [50038, 30005, "Homework Help", 0, 1, 'G', 0, ''],
        [50039, 30005, "Tutorial Sessions", 0, 0, 'G', 0, ''],
        [50040, 30005, "Academic Support", 0, 1, 'G', 0, ''],
        [50041, 30005, "Language Exchange", 0, 1, 'G', 0, ''],
        [50042, 30005, "Skill Development", 0, 0, 'G', 0, ''],
        [50043, 30005, "Educational Forum", 0, 1, 'G', 0, ''],
        [50044, 30005, "Knowledge Share", 0, 1, 'G', 0, ''],
        
        // MEET NEW FRIENDS (30006) - 15 rooms
        [50045, 30006, "Global Connections", 0, 1, 'G', 0, ''],
        [50046, 30006, "Friend Finder", 0, 0, 'G', 0, ''],
        [50047, 30006, "Social Circle", 0, 1, 'G', 0, ''],
        [50048, 30006, "New Beginnings", 0, 1, 'G', 0, ''],
        [50049, 30006, "Meet & Greet", 0, 0, 'G', 0, ''],
        [50050, 30006, "Friendly Chat", 0, 1, 'G', 0, ''],
        [50051, 30006, "Connection Hub", 0, 1, 'G', 0, ''],
        [50052, 30006, "Community Center", 0, 0, 'G', 0, ''],
        [50053, 30006, "Welcome Lounge", 0, 1, 'G', 0, ''],
        [50054, 30006, "Hello World", 0, 1, 'G', 0, ''],
        [50055, 30006, "Networking Space", 0, 0, 'G', 0, ''],
        [50056, 30006, "Coffee Chat", 0, 1, 'G', 0, ''],
        [50057, 30006, "Ice Breakers", 0, 1, 'G', 0, ''],
        [50058, 30006, "Friendship Circle", 0, 0, 'G', 0, ''],
        [50059, 30006, "Social Hub", 0, 1, 'G', 0, ''],
        
        // LOVE AND ROMANCE (30007) - 15 rooms
        [50060, 30007, "Love Talk", 0, 1, 'G', 0, ''],
        [50061, 30007, "Dating Advice", 0, 0, 'G', 0, ''],
        [50062, 30007, "Relationship Chat", 0, 1, 'G', 0, ''],
        [50063, 30007, "Singles Mingle", 0, 1, 'A', 0, ''],
        [50064, 30007, "Romance Corner", 0, 0, 'G', 0, ''],
        [50065, 30007, "Heart to Heart", 0, 1, 'G', 0, ''],
        [50066, 30007, "Dating Stories", 0, 1, 'A', 0, ''],
        [50067, 30007, "Love Advice", 0, 0, 'G', 0, ''],
        [50068, 30007, "Relationship Goals", 0, 1, 'G', 0, ''],
        [50069, 30007, "Flirt Zone", 0, 1, 'A', 0, ''],
        [50070, 30007, "Cupid's Corner", 0, 0, 'G', 0, ''],
        [50071, 30007, "Sweet Romance", 0, 1, 'G', 0, ''],
        [50072, 30007, "Love Stories", 0, 1, 'G', 0, ''],
        [50073, 30007, "Dating Discussion", 0, 0, 'G', 0, ''],
        [50074, 30007, "Relationship Help", 0, 1, 'G', 0, ''],
        
        // SOCIAL ISSUES (30008) - 12 rooms
        [50075, 30008, "Current Events", 0, 1, 'G', 0, ''],
        [50076, 30008, "Social Debates", 0, 0, 'G', 0, ''],
        [50077, 30008, "World Affairs", 0, 1, 'G', 0, ''],
        [50078, 30008, "Political Discussion", 0, 1, 'G', 0, ''],
        [50079, 30008, "Social Justice", 0, 0, 'G', 0, ''],
        [50080, 30008, "Community Issues", 0, 1, 'G', 0, ''],
        [50081, 30008, "Global Topics", 0, 1, 'G', 0, ''],
        [50082, 30008, "Civic Dialogue", 0, 0, 'G', 0, ''],
        [50083, 30008, "Change Makers", 0, 1, 'G', 0, ''],
        [50084, 30008, "Social Awareness", 0, 1, 'G', 0, ''],
        [50085, 30008, "Activism Hub", 0, 0, 'G', 0, ''],
        [50086, 30008, "Debate Forum", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: EUROPE (30009) - 12 rooms
        [50087, 30009, "Français Chat", 0, 1, 'G', 0, ''],
        [50088, 30009, "Deutsch Gespräch", 0, 0, 'G', 0, ''],
        [50089, 30009, "Italiano Forum", 0, 1, 'G', 0, ''],
        [50090, 30009, "Español Europa", 0, 1, 'G', 0, ''],
        [50091, 30009, "Nederlandse Chat", 0, 0, 'G', 0, ''],
        [50092, 30009, "Svenska Samtal", 0, 1, 'G', 0, ''],
        [50093, 30009, "Dansk Forum", 0, 1, 'G', 0, ''],
        [50094, 30009, "Polski Rozmowa", 0, 0, 'G', 0, ''],
        [50095, 30009, "Português Europeu", 0, 1, 'G', 0, ''],
        [50096, 30009, "Greek Chat Room", 0, 1, 'G', 0, ''],
        [50097, 30009, "Suomi Keskustelu", 0, 0, 'G', 0, ''],
        [50098, 30009, "English UK", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: ARABIC (30010) - 10 rooms
        [50099, 30010, "Arabic General Chat", 0, 1, 'G', 0, ''],
        [50100, 30010, "Saudi Arabia Room", 0, 0, 'G', 0, ''],
        [50101, 30010, "Egypt Discussions", 0, 1, 'G', 0, ''],
        [50102, 30010, "UAE Forum", 0, 1, 'G', 0, ''],
        [50103, 30010, "Kuwait Chat", 0, 0, 'G', 0, ''],
        [50104, 30010, "Qatar Room", 0, 1, 'G', 0, ''],
        [50105, 30010, "Bahrain Social", 0, 1, 'G', 0, ''],
        [50106, 30010, "Oman Discussion", 0, 0, 'G', 0, ''],
        [50107, 30010, "Morocco Chat", 0, 1, 'G', 0, ''],
        [50108, 30010, "Lebanon Room", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: SPANISH & PORTUGUESE (30011) - 12 rooms
        [50109, 30011, "España Chat", 0, 1, 'G', 0, ''],
        [50110, 30011, "México Charla", 0, 0, 'G', 0, ''],
        [50111, 30011, "Argentina Foro", 0, 1, 'G', 0, ''],
        [50112, 30011, "Colombia Room", 0, 1, 'G', 0, ''],
        [50113, 30011, "Chile Conversación", 0, 0, 'G', 0, ''],
        [50114, 30011, "Perú Chat", 0, 1, 'G', 0, ''],
        [50115, 30011, "Venezuela Discusión", 0, 1, 'G', 0, ''],
        [50116, 30011, "Brasil Bate-Papo", 0, 0, 'G', 0, ''],
        [50117, 30011, "Portugal Forum", 0, 1, 'G', 0, ''],
        [50118, 30011, "Puerto Rico Social", 0, 1, 'G', 0, ''],
        [50119, 30011, "República Dominicana", 0, 0, 'G', 0, ''],
        [50120, 30011, "Uruguay Chat", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: ASIA & THE FAR EAST (30012) - 12 rooms
        [50121, 30012, "Chinese Chat Room", 0, 1, 'G', 0, ''],
        [50122, 30012, "Japanese Forum", 0, 0, 'G', 0, ''],
        [50123, 30012, "Korean Space", 0, 1, 'G', 0, ''],
        [50124, 30012, "Vietnamese Chat", 0, 1, 'G', 0, ''],
        [50125, 30012, "Thai Discussion", 0, 0, 'G', 0, ''],
        [50126, 30012, "Filipino Room", 0, 1, 'G', 0, ''],
        [50127, 30012, "Indonesian Forum", 0, 1, 'G', 0, ''],
        [50128, 30012, "Malaysian Chat", 0, 0, 'G', 0, ''],
        [50129, 30012, "Taiwanese Room", 0, 1, 'G', 0, ''],
        [50130, 30012, "Singapore Social", 0, 1, 'G', 0, ''],
        [50131, 30012, "Hong Kong Chat", 0, 0, 'G', 0, ''],
        [50132, 30012, "Cambodian Forum", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: MIDDLE EAST (30013) - 10 rooms
        [50133, 30013, "Persian / Farsi Room", 0, 1, 'G', 0, ''],
        [50134, 30013, "Turkish Chat", 0, 0, 'G', 0, ''],
        [50135, 30013, "Kurdish Discussion", 0, 1, 'G', 0, ''],
        [50136, 30013, "Hebrew Forum", 0, 1, 'G', 0, ''],
        [50137, 30013, "Arabic General", 0, 0, 'G', 0, ''],
        [50138, 30013, "Iranian Chat", 0, 1, 'G', 0, ''],
        [50139, 30013, "Syrian Room", 0, 1, 'G', 0, ''],
        [50140, 30013, "Iraqi Discussion", 0, 0, 'G', 0, ''],
        [50141, 30013, "Jordanian Chat", 0, 1, 'G', 0, ''],
        [50142, 30013, "Palestinian Forum", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE: INDIA & PAKISTAN (30014) - 10 rooms
        [50143, 30014, "Hindi Chat Room", 0, 1, 'G', 0, ''],
        [50144, 30014, "Urdu Discussion", 0, 0, 'G', 0, ''],
        [50145, 30014, "Bengali Forum", 0, 1, 'G', 0, ''],
        [50146, 30014, "Tamil Chat", 0, 1, 'G', 0, ''],
        [50147, 30014, "Telugu Room", 0, 0, 'G', 0, ''],
        [50148, 30014, "Malayalam Discussion", 0, 1, 'G', 0, ''],
        [50149, 30014, "Kannada Forum", 0, 1, 'G', 0, ''],
        [50150, 30014, "Punjabi Chat", 0, 0, 'G', 0, ''],
        [50151, 30014, "Gujarati Room", 0, 1, 'G', 0, ''],
        [50152, 30014, "Marathi Discussion", 0, 1, 'G', 0, ''],
        
        // BY LANGUAGE / NATIONALITY / OTHER (30015) - 10 rooms
        [50153, 30015, "Russian Chat Room", 0, 1, 'G', 0, ''],
        [50154, 30015, "Ukrainian Forum", 0, 0, 'G', 0, ''],
        [50155, 30015, "Belarusian Discussion", 0, 1, 'G', 0, ''],
        [50156, 30015, "Romanian Chat", 0, 1, 'G', 0, ''],
        [50157, 30015, "Hungarian Room", 0, 0, 'G', 0, ''],
        [50158, 30015, "Bulgarian Forum", 0, 1, 'G', 0, ''],
        [50159, 30015, "Czech Discussion", 0, 1, 'G', 0, ''],
        [50160, 30015, "Slovak Chat", 0, 0, 'G', 0, ''],
        [50161, 30015, "Croatian Room", 0, 1, 'G', 0, ''],
        [50162, 30015, "Serbian Forum", 0, 1, 'G', 0, ''],
        
        // WELCOME BRAZIL (30016) - 10 rooms
        [50163, 30016, "Rio de Janeiro Chat", 0, 1, 'G', 0, ''],
        [50164, 30016, "São Paulo Room", 0, 0, 'G', 0, ''],
        [50165, 30016, "Brasília Forum", 0, 1, 'G', 0, ''],
        [50166, 30016, "Salvador Discussion", 0, 1, 'G', 0, ''],
        [50167, 30016, "Fortaleza Chat", 0, 0, 'G', 0, ''],
        [50168, 30016, "Recife Room", 0, 1, 'G', 0, ''],
        [50169, 30016, "Belo Horizonte Talk", 0, 1, 'G', 0, ''],
        [50170, 30016, "Manaus Chat", 0, 0, 'G', 0, ''],
        [50171, 30016, "Curitiba Discussion", 0, 1, 'G', 0, ''],
        [50172, 30016, "Porto Alegre Room", 0, 1, 'G', 0, ''],
        
        // EARLY TEENS (30017) - 10 rooms
        [50173, 30017, "Teen Hangout", 0, 1, 'G', 0, ''],
        [50174, 30017, "School Chat", 0, 0, 'G', 0, ''],
        [50175, 30017, "Teen Social Club", 0, 1, 'G', 0, ''],
        [50176, 30017, "Homework Help", 0, 1, 'G', 0, ''],
        [50177, 30017, "Teen Gaming", 0, 0, 'G', 0, ''],
        [50178, 30017, "Teen Music", 0, 1, 'G', 0, ''],
        [50179, 30017, "Teen Sports", 0, 1, 'G', 0, ''],
        [50180, 30017, "Teen Movies", 0, 0, 'G', 0, ''],
        [50181, 30017, "Teen Books", 0, 1, 'G', 0, ''],
        [50182, 30017, "Teen Advice", 0, 1, 'G', 0, ''],
        
        // YOUNG ADULTS (30018) - 10 rooms (including original 3)
        [50183, 30018, "College Life", 0, 1, 'G', 0, ''],
        [50184, 30018, "Career Talk", 0, 0, 'G', 0, ''],
        [50185, 30018, "Twenties Chat", 0, 1, 'G', 0, ''],
        [50186, 30018, "Young Professionals", 0, 1, 'G', 0, ''],
        [50187, 30018, "Apartment Living", 0, 0, 'A', 0, ''],
        [50188, 30018, "First Job Tips", 0, 1, 'G', 0, ''],
        [50189, 30018, "Adulting 101", 0, 1, 'G', 0, ''],
        
        // RELIGIOUS (30019) - 10 rooms
        [50190, 30019, "Faith Discussion", 0, 1, 'G', 0, ''],
        [50191, 30019, "Spiritual Growth", 0, 0, 'G', 0, ''],
        [50192, 30019, "Religious Tolerance", 0, 1, 'G', 0, ''],
        [50193, 30019, "Interfaith Dialogue", 0, 1, 'G', 0, ''],
        [50194, 30019, "Beliefs & Values", 0, 0, 'G', 0, ''],
        [50195, 30019, "Sacred Texts", 0, 1, 'G', 0, ''],
        [50196, 30019, "Meditation Room", 0, 1, 'G', 0, ''],
        [50197, 30019, "Prayer Requests", 0, 0, 'G', 0, ''],
        [50198, 30019, "Religious Philosophy", 0, 1, 'G', 0, ''],
        [50199, 30019, "Worship Discussion", 0, 1, 'G', 0, ''],
        
        // CHRISTIANITY (30020) - 10 rooms
        [50200, 30020, "Bible Study", 0, 1, 'G', 0, ''],
        [50201, 30020, "Christian Fellowship", 0, 0, 'G', 0, ''],
        [50202, 30020, "Gospel Discussion", 0, 1, 'G', 0, ''],
        [50203, 30020, "Catholic Chat", 0, 1, 'G', 0, ''],
        [50204, 30020, "Protestant Forum", 0, 0, 'G', 0, ''],
        [50205, 30020, "Orthodox Discussion", 0, 1, 'G', 0, ''],
        [50206, 30020, "Christian Music", 0, 1, 'G', 0, ''],
        [50207, 30020, "Prayer Circle", 0, 0, 'G', 0, ''],
        [50208, 30020, "Faith Journey", 0, 1, 'G', 0, ''],
        [50209, 30020, "Scripture Study", 0, 1, 'G', 0, ''],
        
        // ISLAM (30021) - 10 rooms
        [50210, 30021, "Islamic Studies", 0, 1, 'G', 0, ''],
        [50211, 30021, "Quran Discussion", 0, 0, 'G', 0, ''],
        [50212, 30021, "Muslim Community", 0, 1, 'G', 0, ''],
        [50213, 30021, "Islamic Faith", 0, 1, 'G', 0, ''],
        [50214, 30021, "Ramadan Talk", 0, 0, 'G', 0, ''],
        [50215, 30021, "Hadith Study", 0, 1, 'G', 0, ''],
        [50216, 30021, "Islamic History", 0, 1, 'G', 0, ''],
        [50217, 30021, "Muslim Youth", 0, 0, 'G', 0, ''],
        [50218, 30021, "Islamic Culture", 0, 1, 'G', 0, ''],
        [50219, 30021, "Prayer Times", 0, 1, 'G', 0, ''],
        
        // JUDAISM (30022) - 10 rooms
        [50220, 30022, "Torah Study", 0, 1, 'G', 0, ''],
        [50221, 30022, "Jewish Community", 0, 0, 'G', 0, ''],
        [50222, 30022, "Shabbat Discussion", 0, 1, 'G', 0, ''],
        [50223, 30022, "Jewish Holidays", 0, 1, 'G', 0, ''],
        [50224, 30022, "Jewish Culture", 0, 0, 'G', 0, ''],
        [50225, 30022, "Hebrew Learning", 0, 1, 'G', 0, ''],
        [50226, 30022, "Jewish History", 0, 1, 'G', 0, ''],
        [50227, 30022, "Jewish Traditions", 0, 0, 'G', 0, ''],
        [50228, 30022, "Israel Discussion", 0, 1, 'G', 0, ''],
        [50229, 30022, "Talmud Study", 0, 1, 'G', 0, ''],
        
        // HEALTH RELATED / PARENTING (30023) - 10 rooms
        [50230, 30023, "Parenting Tips", 0, 1, 'G', 0, ''],
        [50231, 30023, "Health & Wellness", 0, 0, 'G', 0, ''],
        [50232, 30023, "Fitness Chat", 0, 1, 'G', 0, ''],
        [50233, 30023, "Nutrition Forum", 0, 1, 'G', 0, ''],
        [50234, 30023, "Mental Health Support", 0, 0, 'G', 0, ''],
        [50235, 30023, "New Parents", 0, 1, 'G', 0, ''],
        [50236, 30023, "Family Life", 0, 1, 'G', 0, ''],
        [50237, 30023, "Child Development", 0, 0, 'G', 0, ''],
        [50238, 30023, "Teen Parenting", 0, 1, 'G', 0, ''],
        [50239, 30023, "Healthy Living", 0, 1, 'G', 0, ''],
        
        // COMPUTERS - HI TECH (30024) - 15 rooms
        [50240, 30024, "Tech Talk", 0, 1, 'G', 0, ''],
        [50241, 30024, "Programming Chat", 0, 0, 'G', 0, ''],
        [50242, 30024, "Hardware Discussion", 0, 1, 'G', 0, ''],
        [50243, 30024, "Software Forum", 0, 1, 'G', 0, ''],
        [50244, 30024, "Gaming Tech", 0, 0, 'G', 0, ''],
        [50245, 30024, "AI Discussion", 0, 1, 'G', 0, ''],
        [50246, 30024, "Cybersecurity Chat", 0, 1, 'G', 0, ''],
        [50247, 30024, "Web Development", 0, 0, 'G', 0, ''],
        [50248, 30024, "Mobile Tech", 0, 1, 'G', 0, ''],
        [50249, 30024, "Linux Users", 0, 1, 'G', 0, ''],
        [50250, 30024, "Windows Support", 0, 0, 'G', 0, ''],
        [50251, 30024, "Mac Users", 0, 1, 'G', 0, ''],
        [50252, 30024, "Tech Help", 0, 1, 'G', 0, ''],
        [50253, 30024, "Gadget Talk", 0, 0, 'G', 0, ''],
        [50254, 30024, "Tech News", 0, 1, 'G', 0, ''],
        
        // SPORTS AND HOBBIES (30025) - 15 rooms
        [50255, 30025, "Sports Chat", 0, 1, 'G', 0, ''],
        [50256, 30025, "Football/Soccer", 0, 0, 'G', 0, ''],
        [50257, 30025, "Basketball Talk", 0, 1, 'G', 0, ''],
        [50258, 30025, "Baseball Forum", 0, 1, 'G', 0, ''],
        [50259, 30025, "Tennis Discussion", 0, 0, 'G', 0, ''],
        [50260, 30025, "Golf Chat", 0, 1, 'G', 0, ''],
        [50261, 30025, "Hobby Central", 0, 1, 'G', 0, ''],
        [50262, 30025, "Crafting Corner", 0, 0, 'G', 0, ''],
        [50263, 30025, "Photography Club", 0, 1, 'G', 0, ''],
        [50264, 30025, "DIY Projects", 0, 1, 'G', 0, ''],
        [50265, 30025, "Gardening Talk", 0, 0, 'G', 0, ''],
        [50266, 30025, "Gaming Discussion", 0, 1, 'G', 0, ''],
        [50267, 30025, "Cooking Club", 0, 1, 'G', 0, ''],
        [50268, 30025, "Book Readers", 0, 0, 'G', 0, ''],
        [50269, 30025, "Outdoor Activities", 0, 1, 'G', 0, ''],
        
        // BUSINESS AND FINANCE (30026) - 10 rooms
        [50270, 30026, "Business Talk", 0, 1, 'G', 0, ''],
        [50271, 30026, "Investment Chat", 0, 0, 'G', 0, ''],
        [50272, 30026, "Entrepreneurship", 0, 1, 'G', 0, ''],
        [50273, 30026, "Stock Market", 0, 1, 'G', 0, ''],
        [50274, 30026, "Crypto Discussion", 0, 0, 'G', 0, ''],
        [50275, 30026, "Financial Planning", 0, 1, 'G', 0, ''],
        [50276, 30026, "Business Networking", 0, 1, 'G', 0, ''],
        [50277, 30026, "Career Development", 0, 0, 'G', 0, ''],
        [50278, 30026, "Marketing Strategy", 0, 1, 'G', 0, ''],
        [50279, 30026, "Real Estate Talk", 0, 1, 'A', 0, ''],
        
        // MUSIC (30027) - 12 rooms (including original 1)
        [50280, 30027, "Music Lounge", 0, 1, 'G', 0, ''],
        [50281, 30027, "Rock & Roll", 0, 0, 'G', 0, ''],
        [50282, 30027, "Hip Hop Corner", 0, 1, 'G', 0, ''],
        [50283, 30027, "Pop Music", 0, 1, 'G', 0, ''],
        [50284, 30027, "Jazz Club", 0, 0, 'G', 0, ''],
        [50285, 30027, "Classical Music", 0, 1, 'G', 0, ''],
        [50286, 30027, "Electronic Beats", 0, 1, 'G', 0, ''],
        [50287, 30027, "Country Music", 0, 0, 'G', 0, ''],
        [50288, 30027, "Indie Artists", 0, 1, 'G', 0, ''],
        [50289, 30027, "R&B Soul", 0, 1, 'G', 0, ''],
        [50290, 30027, "Metal & Hard Rock", 0, 0, 'G', 0, ''],
        
        // MISCELLANEOUS (30028) - 12 rooms
        [50291, 30028, "Random Chat", 0, 1, 'G', 0, ''],
        [50292, 30028, "General Discussion", 0, 0, 'G', 0, ''],
        [50293, 30028, "Just Talking", 0, 1, 'G', 0, ''],
        [50294, 30028, "Off Topic", 0, 1, 'G', 0, ''],
        [50295, 30028, "Chill Zone", 0, 0, 'G', 0, ''],
        [50296, 30028, "Everything Room", 0, 1, 'G', 0, ''],
        [50297, 30028, "Mixed Topics", 0, 1, 'G', 0, ''],
        [50298, 30028, "Chat Cafe", 0, 0, 'G', 0, ''],
        [50299, 30028, "The Hangout", 0, 1, 'G', 0, ''],
        [50300, 30028, "Something Different", 0, 1, 'G', 0, ''],
        [50301, 30028, "Whatever", 0, 0, 'G', 0, ''],
        [50302, 30028, "Anything Goes", 0, 1, 'A', 0, 'chatpass'],
        
        // ADULT ORIENTED (30029) - 12 rooms
        [50313, 30029, "Adult Chat", 0, 1, 'A', 0, ''],
        [50314, 30029, "Mature Discussions", 0, 0, 'A', 0, ''],
        [50315, 30029, "Adult Topics", 0, 1, 'A', 0, ''],
        [50316, 30029, "18+ Only", 0, 1, 'A', 0, ''],
        [50317, 30029, "Adult Dating", 0, 0, 'A', 0, ''],
        [50318, 30029, "After Dark", 0, 1, 'R', 0, ''],
        [50319, 30029, "Adult Humor", 0, 1, 'A', 0, ''],
        [50320, 30029, "Mature Content", 0, 0, 'A', 0, ''],
        [50321, 30029, "Adult Entertainment", 0, 1, 'R', 0, ''],
        [50322, 30029, "Late Night", 0, 1, 'A', 0, ''],
        [50323, 30029, "Adult Social", 0, 0, 'A', 0, ''],
        [50324, 30029, "VIP Lounge", 0, 1, 'R', 1, 'viponly'],
      ],
    },
  ];

  // Function to run all SQL create table statements
  function runSQLStatements(statements, callback) {
    let completed = 0;
    let hasError = false;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          console.error("Error starting transaction:", err.message);
          return callback(err);
        }

        // Process each statement sequentially
        function processStatement(index) {
          if (index >= statements.length) {
            // All statements processed, commit transaction
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("Error on committing transaction:", err.message);
                return db.run("ROLLBACK", () => callback(err));
              }
              console.log("✅ All table creation statements completed successfully");
              callback(null);
            });
            return;
          }

          const sql = statements[index];
          db.run(sql, (err) => {
            if (err) {
              console.error(`❌ Error running statement #${index + 1}:`, err.message);
              console.error(`SQL: ${sql.substring(0, 100)}...`);
              hasError = true;
              return db.run("ROLLBACK", () => callback(err));
            }
            
            console.log(`✅ Statement #${index + 1} completed successfully`);
            processStatement(index + 1);
          });
        }

        processStatement(0);
      });
    });
  }

  // Function to insert initial data
  function insertInitialData(statements, callback) {
    let statementIndex = 0;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          console.error("Error starting insert transaction:", err.message);
          return callback(err);
        }

        function processInsertStatement(index) {
          if (index >= statements.length) {
            // All insert statements processed, commit transaction
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("Error on committing insert transaction:", err.message);
                return db.run("ROLLBACK", () => callback(err));
              }
              console.log("✅ All data insertion completed successfully");
              callback(null);
            });
            return;
          }

          const { sql, data } = statements[index];
          console.log(`📝 Processing insert statement #${index + 1} with ${data.length} rows`);

          const stmt = db.prepare(sql, (err) => {
            if (err) {
              console.error(`❌ Error preparing insert statement #${index + 1}:`, err.message);
              return db.run("ROLLBACK", () => callback(err));
            }

            let rowIndex = 0;
            function insertRow() {
              if (rowIndex >= data.length) {
                // All rows for this statement inserted, finalize and move to next statement
                stmt.finalize((err) => {
                  if (err) {
                    console.error(`❌ Error finalizing statement #${index + 1}:`, err.message);
                    return db.run("ROLLBACK", () => callback(err));
                  }
                  console.log(`✅ Insert statement #${index + 1} completed`);
                  processInsertStatement(index + 1);
                });
                return;
              }

              const row = data[rowIndex];
              stmt.run(row, (err) => {
                if (err) {
                  console.error(`❌ Error inserting row ${rowIndex + 1} for statement #${index + 1}:`, err.message);
                  console.error(`Data:`, row);
                  return db.run("ROLLBACK", () => callback(err));
                }
                rowIndex++;
                insertRow();
              });
            }

            insertRow();
          });
        }

        processInsertStatement(0);
      });
    });
  }

  // Function to handle errors (simplified since we're using different approach)
  function handleError(operation, callback) {
    return (err) => {
      if (err) {
        console.error(`❌ Error ${operation}:`, err.message);
        callback(err);
      }
    };
  }

  // Main execution flow
  console.log("🚀 Starting database setup...");
  
  runSQLStatements(sqlStatements, (err) => {
    if (err) {
      console.error("❌ Failed to run SQL statements:", err.message);
      db.close();
      return;
    }

    console.log("📊 Tables created successfully, now inserting initial data...");
    
    insertInitialData(insertStatements, (err) => {
      if (err) {
        console.error("❌ Failed to insert initial data:", err.message);
        db.close();
        return;
      }

      console.log("🎉 All operations completed successfully!");
      console.log("📋 Database summary:");
      
      // Get counts of inserted data
      db.serialize(() => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
          if (!err) console.log(`   - Users: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
          if (!err) console.log(`   - Categories: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM groups", (err, row) => {
          if (!err) console.log(`   - Rooms: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM offline_messages", (err, row) => {
          if (!err) {
            console.log(`   - Offline messages: ${row.count}`);
            console.log("✅ Database setup complete!");
            db.close();
          }
        });
      });
    });
  });
});
