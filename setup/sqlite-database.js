const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🚀 Starting SQLite database setup...');
console.log('📁 Database location:', dbPath);

// Create and connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error connecting to SQLite database:", err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to SQLite database');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Drop all tables first
  const dropTables = [
    'DROP TABLE IF EXISTS bounce_logs',
    'DROP TABLE IF EXISTS email_notifications',
    'DROP TABLE IF EXISTS offline_messages',
    'DROP TABLE IF EXISTS groups',
    'DROP TABLE IF EXISTS categories',
    'DROP TABLE IF EXISTS users'
  ];
  
  // Create tables
  const createTables = [
    `CREATE TABLE IF NOT EXISTS users (
      uid INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      first TEXT NOT NULL DEFAULT '',
      last TEXT NOT NULL DEFAULT '',
      privacy TEXT NOT NULL DEFAULT 'A',
      verified INTEGER NOT NULL DEFAULT 0,
      random TEXT NOT NULL DEFAULT '0',
      paid1 INTEGER NOT NULL DEFAULT 0,
      get_offers_from_us TEXT NOT NULL DEFAULT 'N',
      get_offers_from_affiliates TEXT NOT NULL DEFAULT 'N',
      show_email TEXT NOT NULL DEFAULT 'Y',
      show_first TEXT NOT NULL DEFAULT 'Y',
      show_last TEXT NOT NULL DEFAULT 'Y',
      banners TEXT NOT NULL DEFAULT 'yes',
      admin INTEGER NOT NULL DEFAULT 0,
      sup INTEGER NOT NULL DEFAULT 0,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      listed INTEGER NOT NULL DEFAULT 1,
      buddies TEXT NOT NULL DEFAULT '',
      blocked TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '000000000',
      password TEXT NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS offline_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER NOT NULL,
      receiver INTEGER NOT NULL,
      sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      content TEXT NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS categories (
      code INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY,
      catg INTEGER,
      r TEXT NOT NULL DEFAULT 'G',
      v INTEGER NOT NULL DEFAULT 1,
      p INTEGER NOT NULL DEFAULT 0,
      password TEXT NOT NULL DEFAULT '',
      l INTEGER NOT NULL DEFAULT 0,
      c TEXT NOT NULL DEFAULT '000000000',
      nm TEXT,
      mike INTEGER NOT NULL DEFAULT 1,
      text INTEGER NOT NULL DEFAULT 0,
      video INTEGER NOT NULL DEFAULT 0,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      owner INTEGER DEFAULT NULL,
      cr TEXT NOT NULL DEFAULT '',
      topic TEXT DEFAULT 'Please support our sponsors.',
      isClosed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (catg) REFERENCES categories(code),
      FOREIGN KEY (owner) REFERENCES users(uid)
    )`,
    
    `CREATE TABLE IF NOT EXISTS email_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active',
      ip_address TEXT DEFAULT NULL,
      user_agent TEXT DEFAULT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS bounce_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bouncer_uin INTEGER NOT NULL,
      bouncer_nickname TEXT DEFAULT NULL,
      bouncee_uin INTEGER NOT NULL,
      bouncee_nickname TEXT DEFAULT NULL,
      room_id INTEGER NOT NULL,
      room_name TEXT DEFAULT NULL,
      reason TEXT DEFAULT NULL,
      bounce_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bouncer_uin) REFERENCES users(uid),
      FOREIGN KEY (bouncee_uin) REFERENCES users(uid),
      FOREIGN KEY (room_id) REFERENCES groups(id)
    )`
  ];
  
  // Insert statements with data
  const insertStatements = [
    {
      sql: `INSERT INTO users (uid, nickname, email, first, last, paid1, get_offers_from_us, get_offers_from_affiliates, show_email, show_first, show_last, banners, admin, password, color, buddies, blocked, listed) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data: [
        [1000002, "NetStorm", "default@example.com", "Net", "Storm", 6, 'N', 'N', 'Y', 'Y', 'Y', 'no', 0, "default_password_hash", "000128000", '[{"uid": 1000004, "nickname": "Dan"}]', "", 1],
        [1000003, "Medianoche (co-admin)", "medianoche@example.com", "Media", "Noche", 1, 'N', 'N', 'Y', 'Y', 'Y', 'no', 1, "default_password_hash", "128000000", "[]", "", 1],
        [1000004, "Dan", "dan@example.com", "Dan", "Crawley", 6, 'N', 'N', 'Y', 'Y', 'Y', 'yes', 1, "default_password_hash", "128000000", "[]", "", 1]
      ]
    },
    {
      sql: `INSERT INTO offline_messages (sender, receiver, sent, status, content) 
            VALUES (?, ?, ?, ?, ?)`,
      data: [
        [1000001, 1000002, new Date().toISOString(), "pending", "Welcome :)"]
      ]
    },
    {
      sql: `INSERT INTO categories (code, value) VALUES (?, ?)`,
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
        [30029, "Adult Oriented"]
      ]
    },
    {
      sql: `INSERT INTO groups (id, catg, nm, owner, v, r, l, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data: [
        // KEEP ORIGINAL 8 ROOMS
        [50001, 30018, "*** The Royal Oak ***", 1000002, 1, 'G', 0, ''],
        [50002, 30018, "*** H2K Clan ***", null, 1, 'G', 0, ''],
        [50003, 30018, "*** The Tuck INN ***", null, 1, 'A', 0, ''],
        [50004, 30027, "*** The Quiet Side ***", null, 0, 'A', 0, ''],
        [50005, 30003, "Paltalk Help Lobby 1", null, 1, 'G', 0, ''],
        [50006, 30003, "Paltalk Tech Support 1", null, 1, 'G', 0, ''],
        [50007, 30003, "Paltalk Tech Support 2", null, 1, 'G', 0, ''],
        [50008, 30003, "--- Paltalk Support Online ---", null, 0, 'G', 1, 'support'],
        
        // FEATURED ROOMS (30002) - 10 rooms
        [50009, 30002, "Weekend Warriors", null, 1, 'G', 0, ''],
        [50010, 30002, "Special Events", null, 1, 'G', 0, ''],
        [50011, 30002, "Spotlight Room", null, 1, 'G', 0, ''],
        [50012, 30002, "Featured Discussion", null, 0, 'G', 0, ''],
        [50013, 30002, "Highlighted Topics", null, 1, 'G', 0, ''],
        [50014, 30002, "Weekly Showcase", null, 1, 'G', 0, ''],
        [50015, 30002, "Recommended Chat", null, 0, 'G', 0, ''],
        [50016, 30002, "Select Conversations", null, 1, 'G', 0, ''],
        [50017, 30002, "Prime Discussion", null, 1, 'G', 0, ''],
        [50018, 30002, "Choice Room", null, 0, 'G', 0, ''],
        
        // PALTALK HELP ROOMS (30003) - 10 rooms (including original 4)
        [50019, 30003, "Paltalk Help Lobby 2", null, 1, 'G', 0, ''],
        [50020, 30003, "New Users Help", null, 1, 'G', 0, ''],
        [50021, 30003, "FAQ Discussion", null, 0, 'G', 0, ''],
        [50022, 30003, "Account Support", null, 1, 'G', 0, ''],
        [50023, 30003, "Technical Issues", null, 1, 'G', 0, ''],
        [50024, 30003, "App Tips & Tricks", null, 0, 'G', 0, ''],
        
        // PALTALK RADIO (30004) - 10 rooms
        [50025, 30004, "Music Station", null, 1, 'G', 0, ''],
        [50026, 30004, "Talk Radio Central", null, 1, 'G', 0, ''],
        [50027, 30004, "Podcast Hub", null, 0, 'G', 0, ''],
        [50028, 30004, "Live DJ Sessions", null, 1, 'G', 0, ''],
        [50029, 30004, "Audio Broadcast", null, 1, 'G', 0, ''],
        [50030, 30004, "Radio Workshop", null, 0, 'G', 0, ''],
        [50031, 30004, "Music Sharing", null, 1, 'G', 0, ''],
        [50032, 30004, "Radio Discussions", null, 1, 'G', 0, ''],
        [50033, 30004, "DJ Hangout", null, 0, 'G', 0, ''],
        [50034, 30004, "Broadcast Central", null, 1, 'G', 0, ''],
        
        // DISTANCE LEARNING (30005) - 10 rooms
        [50035, 30005, "Study Group", null, 1, 'G', 0, ''],
        [50036, 30005, "Online Classes", null, 1, 'G', 0, ''],
        [50037, 30005, "E-Learning Hub", null, 0, 'G', 0, ''],
        [50038, 30005, "Homework Help", null, 1, 'G', 0, ''],
        [50039, 30005, "Tutorial Sessions", null, 0, 'G', 0, ''],
        [50040, 30005, "Academic Support", null, 1, 'G', 0, ''],
        [50041, 30005, "Language Exchange", null, 1, 'G', 0, ''],
        [50042, 30005, "Skill Development", null, 0, 'G', 0, ''],
        [50043, 30005, "Educational Forum", null, 1, 'G', 0, ''],
        [50044, 30005, "Knowledge Share", null, 1, 'G', 0, ''],
        
        // MEET NEW FRIENDS (30006) - 15 rooms
        [50045, 30006, "Global Connections", null, 1, 'G', 0, ''],
        [50046, 30006, "Friend Finder", null, 0, 'G', 0, ''],
        [50047, 30006, "Social Circle", null, 1, 'G', 0, ''],
        [50048, 30006, "New Beginnings", null, 1, 'G', 0, ''],
        [50049, 30006, "Meet & Greet", null, 0, 'G', 0, ''],
        [50050, 30006, "Friendly Chat", null, 1, 'G', 0, ''],
        [50051, 30006, "Connection Hub", null, 1, 'G', 0, ''],
        [50052, 30006, "Community Center", null, 0, 'G', 0, ''],
        [50053, 30006, "Welcome Lounge", null, 1, 'G', 0, ''],
        [50054, 30006, "Hello World", null, 1, 'G', 0, ''],
        [50055, 30006, "Networking Space", null, 0, 'G', 0, ''],
        [50056, 30006, "Coffee Chat", null, 1, 'G', 0, ''],
        [50057, 30006, "Ice Breakers", null, 1, 'G', 0, ''],
        [50058, 30006, "Friendship Circle", null, 0, 'G', 0, ''],
        [50059, 30006, "Social Hub", null, 1, 'G', 0, ''],
        
        // LOVE AND ROMANCE (30007) - 15 rooms
        [50060, 30007, "Love Talk", null, 1, 'G', 0, ''],
        [50061, 30007, "Dating Advice", null, 0, 'G', 0, ''],
        [50062, 30007, "Relationship Chat", null, 1, 'G', 0, ''],
        [50063, 30007, "Singles Mingle", null, 1, 'A', 0, ''],
        [50064, 30007, "Romance Corner", null, 0, 'G', 0, ''],
        [50065, 30007, "Heart to Heart", null, 1, 'G', 0, ''],
        [50066, 30007, "Dating Stories", null, 1, 'A', 0, ''],
        [50067, 30007, "Love Advice", null, 0, 'G', 0, ''],
        [50068, 30007, "Relationship Goals", null, 1, 'G', 0, ''],
        [50069, 30007, "Flirt Zone", null, 1, 'A', 0, ''],
        [50070, 30007, "Cupid's Corner", null, 0, 'G', 0, ''],
        [50071, 30007, "Sweet Romance", null, 1, 'G', 0, ''],
        [50072, 30007, "Love Stories", null, 1, 'G', 0, ''],
        [50073, 30007, "Dating Discussion", null, 0, 'G', 0, ''],
        [50074, 30007, "Relationship Help", null, 1, 'G', 0, ''],
        
        // SOCIAL ISSUES (30008) - 12 rooms
        [50075, 30008, "Current Events", null, 1, 'G', 0, ''],
        [50076, 30008, "Social Debates", null, 0, 'G', 0, ''],
        [50077, 30008, "World Affairs", null, 1, 'G', 0, ''],
        [50078, 30008, "Political Discussion", null, 1, 'G', 0, ''],
        [50079, 30008, "Social Justice", null, 0, 'G', 0, ''],
        [50080, 30008, "Community Issues", null, 1, 'G', 0, ''],
        [50081, 30008, "Global Topics", null, 1, 'G', 0, ''],
        [50082, 30008, "Civic Dialogue", null, 0, 'G', 0, ''],
        [50083, 30008, "Change Makers", null, 1, 'G', 0, ''],
        [50084, 30008, "Social Awareness", null, 1, 'G', 0, ''],
        [50085, 30008, "Activism Hub", null, 0, 'G', 0, ''],
        [50086, 30008, "Debate Forum", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: EUROPE (30009) - 12 rooms
        [50087, 30009, "Français Chat", null, 1, 'G', 0, ''],
        [50088, 30009, "Deutsch Gespräch", null, 0, 'G', 0, ''],
        [50089, 30009, "Italiano Forum", null, 1, 'G', 0, ''],
        [50090, 30009, "Español Europa", null, 1, 'G', 0, ''],
        [50091, 30009, "Nederlandse Chat", null, 0, 'G', 0, ''],
        [50092, 30009, "Svenska Samtal", null, 1, 'G', 0, ''],
        [50093, 30009, "Dansk Forum", null, 1, 'G', 0, ''],
        [50094, 30009, "Polski Rozmowa", null, 0, 'G', 0, ''],
        [50095, 30009, "Português Europeu", null, 1, 'G', 0, ''],
        [50096, 30009, "Greek Chat Room", null, 1, 'G', 0, ''],
        [50097, 30009, "Suomi Keskustelu", null, 0, 'G', 0, ''],
        [50098, 30009, "English UK", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: ARABIC (30010) - 10 rooms
        [50099, 30010, "Arabic General Chat", null, 1, 'G', 0, ''],
        [50100, 30010, "Saudi Arabia Room", null, 0, 'G', 0, ''],
        [50101, 30010, "Egypt Discussions", null, 1, 'G', 0, ''],
        [50102, 30010, "UAE Forum", null, 1, 'G', 0, ''],
        [50103, 30010, "Kuwait Chat", null, 0, 'G', 0, ''],
        [50104, 30010, "Qatar Room", null, 1, 'G', 0, ''],
        [50105, 30010, "Bahrain Social", null, 1, 'G', 0, ''],
        [50106, 30010, "Oman Discussion", null, 0, 'G', 0, ''],
        [50107, 30010, "Morocco Chat", null, 1, 'G', 0, ''],
        [50108, 30010, "Lebanon Room", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: SPANISH & PORTUGUESE (30011) - 12 rooms
        [50109, 30011, "España Chat", null, 1, 'G', 0, ''],
        [50110, 30011, "México Charla", null, 0, 'G', 0, ''],
        [50111, 30011, "Argentina Foro", null, 1, 'G', 0, ''],
        [50112, 30011, "Colombia Room", null, 1, 'G', 0, ''],
        [50113, 30011, "Chile Conversación", null, 0, 'G', 0, ''],
        [50114, 30011, "Perú Chat", null, 1, 'G', 0, ''],
        [50115, 30011, "Venezuela Discusión", null, 1, 'G', 0, ''],
        [50116, 30011, "Brasil Bate-Papo", null, 0, 'G', 0, ''],
        [50117, 30011, "Portugal Forum", null, 1, 'G', 0, ''],
        [50118, 30011, "Puerto Rico Social", null, 1, 'G', 0, ''],
        [50119, 30011, "República Dominicana", null, 0, 'G', 0, ''],
        [50120, 30011, "Uruguay Chat", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: ASIA & THE FAR EAST (30012) - 12 rooms
        [50121, 30012, "Chinese Chat Room", null, 1, 'G', 0, ''],
        [50122, 30012, "Japanese Forum", null, 0, 'G', 0, ''],
        [50123, 30012, "Korean Space", null, 1, 'G', 0, ''],
        [50124, 30012, "Vietnamese Chat", null, 1, 'G', 0, ''],
        [50125, 30012, "Thai Discussion", null, 0, 'G', 0, ''],
        [50126, 30012, "Filipino Room", null, 1, 'G', 0, ''],
        [50127, 30012, "Indonesian Forum", null, 1, 'G', 0, ''],
        [50128, 30012, "Malaysian Chat", null, 0, 'G', 0, ''],
        [50129, 30012, "Taiwanese Room", null, 1, 'G', 0, ''],
        [50130, 30012, "Singapore Social", null, 1, 'G', 0, ''],
        [50131, 30012, "Hong Kong Chat", null, 0, 'G', 0, ''],
        [50132, 30012, "Cambodian Forum", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: MIDDLE EAST (30013) - 10 rooms
        [50133, 30013, "Persian / Farsi Room", null, 1, 'G', 0, ''],
        [50134, 30013, "Turkish Chat", null, 0, 'G', 0, ''],
        [50135, 30013, "Kurdish Discussion", null, 1, 'G', 0, ''],
        [50136, 30013, "Hebrew Forum", null, 1, 'G', 0, ''],
        [50137, 30013, "Arabic General", null, 0, 'G', 0, ''],
        [50138, 30013, "Iranian Chat", null, 1, 'G', 0, ''],
        [50139, 30013, "Syrian Room", null, 1, 'G', 0, ''],
        [50140, 30013, "Iraqi Discussion", null, 0, 'G', 0, ''],
        [50141, 30013, "Jordanian Chat", null, 1, 'G', 0, ''],
        [50142, 30013, "Palestinian Forum", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE: INDIA & PAKISTAN (30014) - 10 rooms
        [50143, 30014, "Hindi Chat Room", null, 1, 'G', 0, ''],
        [50144, 30014, "Urdu Discussion", null, 0, 'G', 0, ''],
        [50145, 30014, "Bengali Forum", null, 1, 'G', 0, ''],
        [50146, 30014, "Tamil Chat", null, 1, 'G', 0, ''],
        [50147, 30014, "Telugu Room", null, 0, 'G', 0, ''],
        [50148, 30014, "Malayalam Discussion", null, 1, 'G', 0, ''],
        [50149, 30014, "Kannada Forum", null, 1, 'G', 0, ''],
        [50150, 30014, "Punjabi Chat", null, 0, 'G', 0, ''],
        [50151, 30014, "Gujarati Room", null, 1, 'G', 0, ''],
        [50152, 30014, "Marathi Discussion", null, 1, 'G', 0, ''],
        
        // BY LANGUAGE / NATIONALITY / OTHER (30015) - 10 rooms
        [50153, 30015, "Russian Chat Room", null, 1, 'G', 0, ''],
        [50154, 30015, "Ukrainian Forum", null, 0, 'G', 0, ''],
        [50155, 30015, "Belarusian Discussion", null, 1, 'G', 0, ''],
        [50156, 30015, "Romanian Chat", null, 1, 'G', 0, ''],
        [50157, 30015, "Hungarian Room", null, 0, 'G', 0, ''],
        [50158, 30015, "Bulgarian Forum", null, 1, 'G', 0, ''],
        [50159, 30015, "Czech Discussion", null, 1, 'G', 0, ''],
        [50160, 30015, "Slovak Chat", null, 0, 'G', 0, ''],
        [50161, 30015, "Croatian Room", null, 1, 'G', 0, ''],
        [50162, 30015, "Serbian Forum", null, 1, 'G', 0, ''],
        
        // WELCOME BRAZIL (30016) - 10 rooms
        [50163, 30016, "Rio de Janeiro Chat", null, 1, 'G', 0, ''],
        [50164, 30016, "São Paulo Room", null, 0, 'G', 0, ''],
        [50165, 30016, "Brasília Forum", null, 1, 'G', 0, ''],
        [50166, 30016, "Salvador Discussion", null, 1, 'G', 0, ''],
        [50167, 30016, "Fortaleza Chat", null, 0, 'G', 0, ''],
        [50168, 30016, "Recife Room", null, 1, 'G', 0, ''],
        [50169, 30016, "Belo Horizonte Talk", null, 1, 'G', 0, ''],
        [50170, 30016, "Manaus Chat", null, 0, 'G', 0, ''],
        [50171, 30016, "Curitiba Discussion", null, 1, 'G', 0, ''],
        [50172, 30016, "Porto Alegre Room", null, 1, 'G', 0, ''],
        
        // EARLY TEENS (30017) - 10 rooms
        [50173, 30017, "Teen Hangout", null, 1, 'G', 0, ''],
        [50174, 30017, "School Chat", null, 0, 'G', 0, ''],
        [50175, 30017, "Teen Social Club", null, 1, 'G', 0, ''],
        [50176, 30017, "Homework Help", null, 1, 'G', 0, ''],
        [50177, 30017, "Teen Gaming", null, 0, 'G', 0, ''],
        [50178, 30017, "Teen Music", null, 1, 'G', 0, ''],
        [50179, 30017, "Teen Sports", null, 1, 'G', 0, ''],
        [50180, 30017, "Teen Movies", null, 0, 'G', 0, ''],
        [50181, 30017, "Teen Books", null, 1, 'G', 0, ''],
        [50182, 30017, "Teen Advice", null, 1, 'G', 0, ''],
        
        // YOUNG ADULTS (30018) - 10 rooms (including original 3)
        [50183, 30018, "College Life", null, 1, 'G', 0, ''],
        [50184, 30018, "Career Talk", null, 0, 'G', 0, ''],
        [50185, 30018, "Twenties Chat", null, 1, 'G', 0, ''],
        [50186, 30018, "Young Professionals", null, 1, 'G', 0, ''],
        [50187, 30018, "Apartment Living", null, 0, 'A', 0, ''],
        [50188, 30018, "First Job Tips", null, 1, 'G', 0, ''],
        [50189, 30018, "Adulting 101", null, 1, 'G', 0, ''],
        
        // RELIGIOUS (30019) - 10 rooms
        [50190, 30019, "Faith Discussion", null, 1, 'G', 0, ''],
        [50191, 30019, "Spiritual Growth", null, 0, 'G', 0, ''],
        [50192, 30019, "Religious Tolerance", null, 1, 'G', 0, ''],
        [50193, 30019, "Interfaith Dialogue", null, 1, 'G', 0, ''],
        [50194, 30019, "Beliefs & Values", null, 0, 'G', 0, ''],
        [50195, 30019, "Sacred Texts", null, 1, 'G', 0, ''],
        [50196, 30019, "Meditation Room", null, 1, 'G', 0, ''],
        [50197, 30019, "Prayer Requests", null, 0, 'G', 0, ''],
        [50198, 30019, "Religious Philosophy", null, 1, 'G', 0, ''],
        [50199, 30019, "Worship Discussion", null, 1, 'G', 0, ''],
        
        // CHRISTIANITY (30020) - 10 rooms
        [50200, 30020, "Bible Study", null, 1, 'G', 0, ''],
        [50201, 30020, "Christian Fellowship", null, 0, 'G', 0, ''],
        [50202, 30020, "Gospel Discussion", null, 1, 'G', 0, ''],
        [50203, 30020, "Catholic Chat", null, 1, 'G', 0, ''],
        [50204, 30020, "Protestant Forum", null, 0, 'G', 0, ''],
        [50205, 30020, "Orthodox Discussion", null, 1, 'G', 0, ''],
        [50206, 30020, "Christian Music", null, 1, 'G', 0, ''],
        [50207, 30020, "Prayer Circle", null, 0, 'G', 0, ''],
        [50208, 30020, "Faith Journey", null, 1, 'G', 0, ''],
        [50209, 30020, "Scripture Study", null, 1, 'G', 0, ''],
        
        // ISLAM (30021) - 10 rooms
        [50210, 30021, "Islamic Studies", null, 1, 'G', 0, ''],
        [50211, 30021, "Quran Discussion", null, 0, 'G', 0, ''],
        [50212, 30021, "Muslim Community", null, 1, 'G', 0, ''],
        [50213, 30021, "Islamic Faith", null, 1, 'G', 0, ''],
        [50214, 30021, "Ramadan Talk", null, 0, 'G', 0, ''],
        [50215, 30021, "Hadith Study", null, 1, 'G', 0, ''],
        [50216, 30021, "Islamic History", null, 1, 'G', 0, ''],
        [50217, 30021, "Muslim Youth", null, 0, 'G', 0, ''],
        [50218, 30021, "Islamic Culture", null, 1, 'G', 0, ''],
        [50219, 30021, "Prayer Times", null, 1, 'G', 0, ''],
        
        // JUDAISM (30022) - 10 rooms
        [50220, 30022, "Torah Study", null, 1, 'G', 0, ''],
        [50221, 30022, "Jewish Community", null, 0, 'G', 0, ''],
        [50222, 30022, "Shabbat Discussion", null, 1, 'G', 0, ''],
        [50223, 30022, "Jewish Holidays", null, 1, 'G', 0, ''],
        [50224, 30022, "Jewish Culture", null, 0, 'G', 0, ''],
        [50225, 30022, "Hebrew Learning", null, 1, 'G', 0, ''],
        [50226, 30022, "Jewish History", null, 1, 'G', 0, ''],
        [50227, 30022, "Jewish Traditions", null, 0, 'G', 0, ''],
        [50228, 30022, "Israel Discussion", null, 1, 'G', 0, ''],
        [50229, 30022, "Talmud Study", null, 1, 'G', 0, ''],
        
        // HEALTH RELATED / PARENTING (30023) - 10 rooms
        [50230, 30023, "Parenting Tips", null, 1, 'G', 0, ''],
        [50231, 30023, "Health & Wellness", null, 0, 'G', 0, ''],
        [50232, 30023, "Fitness Chat", null, 1, 'G', 0, ''],
        [50233, 30023, "Nutrition Forum", null, 1, 'G', 0, ''],
        [50234, 30023, "Mental Health Support", null, 0, 'G', 0, ''],
        [50235, 30023, "New Parents", null, 1, 'G', 0, ''],
        [50236, 30023, "Family Life", null, 1, 'G', 0, ''],
        [50237, 30023, "Child Development", null, 0, 'G', 0, ''],
        [50238, 30023, "Teen Parenting", null, 1, 'G', 0, ''],
        [50239, 30023, "Healthy Living", null, 1, 'G', 0, ''],
        
        // COMPUTERS - HI TECH (30024) - 15 rooms
        [50240, 30024, "Tech Talk", null, 1, 'G', 0, ''],
        [50241, 30024, "Programming Chat", null, 0, 'G', 0, ''],
        [50242, 30024, "Hardware Discussion", null, 1, 'G', 0, ''],
        [50243, 30024, "Software Forum", null, 1, 'G', 0, ''],
        [50244, 30024, "Gaming Tech", null, 0, 'G', 0, ''],
        [50245, 30024, "AI Discussion", null, 1, 'G', 0, ''],
        [50246, 30024, "Cybersecurity Chat", null, 1, 'G', 0, ''],
        [50247, 30024, "Web Development", null, 0, 'G', 0, ''],
        [50248, 30024, "Mobile Tech", null, 1, 'G', 0, ''],
        [50249, 30024, "Linux Users", null, 1, 'G', 0, ''],
        [50250, 30024, "Windows Support", null, 0, 'G', 0, ''],
        [50251, 30024, "Mac Users", null, 1, 'G', 0, ''],
        [50252, 30024, "Tech Help", null, 1, 'G', 0, ''],
        [50253, 30024, "Gadget Talk", null, 0, 'G', 0, ''],
        [50254, 30024, "Tech News", null, 1, 'G', 0, ''],
        
        // SPORTS AND HOBBIES (30025) - 15 rooms
        [50255, 30025, "Sports Chat", null, 1, 'G', 0, ''],
        [50256, 30025, "Football/Soccer", null, 0, 'G', 0, ''],
        [50257, 30025, "Basketball Talk", null, 1, 'G', 0, ''],
        [50258, 30025, "Baseball Forum", null, 1, 'G', 0, ''],
        [50259, 30025, "Tennis Discussion", null, 0, 'G', 0, ''],
        [50260, 30025, "Golf Chat", null, 1, 'G', 0, ''],
        [50261, 30025, "Hobby Central", null, 1, 'G', 0, ''],
        [50262, 30025, "Crafting Corner", null, 0, 'G', 0, ''],
        [50263, 30025, "Photography Club", null, 1, 'G', 0, ''],
        [50264, 30025, "DIY Projects", null, 1, 'G', 0, ''],
        [50265, 30025, "Gardening Talk", null, 0, 'G', 0, ''],
        [50266, 30025, "Gaming Discussion", null, 1, 'G', 0, ''],
        [50267, 30025, "Cooking Club", null, 1, 'G', 0, ''],
        [50268, 30025, "Book Readers", null, 0, 'G', 0, ''],
        [50269, 30025, "Outdoor Activities", null, 1, 'G', 0, ''],
        
        // BUSINESS AND FINANCE (30026) - 10 rooms
        [50270, 30026, "Business Talk", null, 1, 'G', 0, ''],
        [50271, 30026, "Investment Chat", null, 0, 'G', 0, ''],
        [50272, 30026, "Entrepreneurship", null, 1, 'G', 0, ''],
        [50273, 30026, "Stock Market", null, 1, 'G', 0, ''],
        [50274, 30026, "Crypto Discussion", null, 0, 'G', 0, ''],
        [50275, 30026, "Financial Planning", null, 1, 'G', 0, ''],
        [50276, 30026, "Business Networking", null, 1, 'G', 0, ''],
        [50277, 30026, "Career Development", null, 0, 'G', 0, ''],
        [50278, 30026, "Marketing Strategy", null, 1, 'G', 0, ''],
        [50279, 30026, "Real Estate Talk", null, 1, 'A', 0, ''],
        
        // MUSIC (30027) - 12 rooms (including original 1)
        [50280, 30027, "Music Lounge", null, 1, 'G', 0, ''],
        [50281, 30027, "Rock & Roll", null, 0, 'G', 0, ''],
        [50282, 30027, "Hip Hop Corner", null, 1, 'G', 0, ''],
        [50283, 30027, "Pop Music", null, 1, 'G', 0, ''],
        [50284, 30027, "Jazz Club", null, 0, 'G', 0, ''],
        [50285, 30027, "Classical Music", null, 1, 'G', 0, ''],
        [50286, 30027, "Electronic Beats", null, 1, 'G', 0, ''],
        [50287, 30027, "Country Music", null, 0, 'G', 0, ''],
        [50288, 30027, "Indie Artists", null, 1, 'G', 0, ''],
        [50289, 30027, "R&B Soul", null, 1, 'G', 0, ''],
        [50290, 30027, "Metal & Hard Rock", null, 0, 'G', 0, ''],
        
        // MISCELLANEOUS (30028) - 12 rooms
        [50291, 30028, "Random Chat", null, 1, 'G', 0, ''],
        [50292, 30028, "General Discussion", null, 0, 'G', 0, ''],
        [50293, 30028, "Just Talking", null, 1, 'G', 0, ''],
        [50294, 30028, "Off Topic", null, 1, 'G', 0, ''],
        [50295, 30028, "Chill Zone", null, 0, 'G', 0, ''],
        [50296, 30028, "Everything Room", null, 1, 'G', 0, ''],
        [50297, 30028, "Mixed Topics", null, 1, 'G', 0, ''],
        [50298, 30028, "Chat Cafe", null, 0, 'G', 0, ''],
        [50299, 30028, "The Hangout", null, 1, 'G', 0, ''],
        [50300, 30028, "Something Different", null, 1, 'G', 0, ''],
        [50301, 30028, "Whatever", null, 0, 'G', 0, ''],
        [50302, 30028, "Anything Goes", null, 1, 'A', 0, 'chatpass'],
        
        // ADULT ORIENTED (30029) - 12 rooms
        [50313, 30029, "Adult Chat", null, 1, 'A', 0, ''],
        [50314, 30029, "Mature Discussions", null, 0, 'A', 0, ''],
        [50315, 30029, "Adult Topics", null, 1, 'A', 0, ''],
        [50316, 30029, "18+ Only", null, 1, 'A', 0, ''],
        [50317, 30029, "Adult Dating", null, 0, 'A', 0, ''],
        [50318, 30029, "After Dark", null, 1, 'R', 0, ''],
        [50319, 30029, "Adult Humor", null, 1, 'A', 0, ''],
        [50320, 30029, "Mature Content", null, 0, 'A', 0, ''],
        [50321, 30029, "Adult Entertainment", null, 1, 'R', 0, ''],
        [50322, 30029, "Late Night", null, 1, 'A', 0, ''],
        [50323, 30029, "Adult Social", null, 0, 'A', 0, ''],
        [50324, 30029, "VIP Lounge", null, 1, 'R', 1, 'viponly']
      ]
    }
  ];
  
  console.log('🔧 Dropping existing tables...');
  
  // Execute all drop statements
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    dropTables.forEach(sql => {
      db.run(sql, (err) => {
        if (err) {
          console.error('Error dropping table:', err.message);
        }
      });
    });
    
    console.log('✅ Tables dropped');
    console.log('🏗️ Creating tables...');
    
    // Execute all create statements
    createTables.forEach(sql => {
      db.run(sql, (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
        }
      });
    });
    
    console.log('✅ Tables created');
    console.log('📊 Inserting initial data...');
    
    // Insert initial data
    insertStatements.forEach(({ sql, data }) => {
      const stmt = db.prepare(sql);
      data.forEach(row => {
        stmt.run(row, (err) => {
          if (err) {
            console.error('Error inserting data:', err.message);
          }
        });
      });
      stmt.finalize();
    });
    
    db.run('COMMIT', (err) => {
      if (err) {
        console.error('Error committing transaction:', err.message);
        return;
      }
      
      console.log('✅ Data insertion completed');
      console.log('📋 Database summary:');
      
      // Get counts
      db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (!err) console.log(`   - Users: ${result.count}`);
        
        db.get('SELECT COUNT(*) as count FROM categories', (err, result) => {
          if (!err) console.log(`   - Categories: ${result.count}`);
          
          db.get('SELECT COUNT(*) as count FROM groups', (err, result) => {
            if (!err) console.log(`   - Rooms: ${result.count}`);
            
            db.get('SELECT COUNT(*) as count FROM offline_messages', (err, result) => {
              if (!err) {
                console.log(`   - Offline messages: ${result.count}`);
                console.log('🎉 SQLite database setup complete!');
                console.log('📍 Database file created at:', dbPath);
                
                db.close((err) => {
                  if (err) {
                    console.error('Error closing database:', err.message);
                  } else {
                    console.log('✅ Database connection closed');
                  }
                });
              }
            });
          });
        });
      });
    });
  });
});