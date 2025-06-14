#!/usr/bin/env node

/**
 * Script to add 30 new diverse rooms to existing database
 */

const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }

  console.log("🏠 Adding 30 new diverse rooms to Paltalk server...");

  // New rooms data
  const newRooms = [
    // TOP ROOMS (30001)
    [60001, 30001, "The Main Event", 0, 1, 'G', 0, ''],
    [60002, 30001, "VIP Lounge", 0, 1, 'A', 1, 'exclusive'],
    [60003, 30001, "Comedy Central", 0, 1, 'T', 0, ''],
    
    // FEATURED ROOMS (30002)
    [60004, 30002, "Weekend Warriors", 0, 1, 'A', 0, ''],
    [60005, 30002, "Secret Garden", 0, 0, 'G', 1, 'flowers'],
    
    // MEET NEW FRIENDS (30006)
    [60006, 30006, "Global Connections", 0, 1, 'G', 0, ''],
    [60007, 30006, "Coffee Chat", 0, 0, 'G', 0, ''],
    [60008, 30006, "Midnight Express", 0, 1, 'A', 0, ''],
    [60009, 30006, "Friendship Circle", 0, 1, 'T', 0, ''],
    
    // LOVE AND ROMANCE (30007)
    [60010, 30007, "Cupid's Corner", 0, 1, 'A', 0, ''],
    [60011, 30007, "Sweet Dreams", 0, 0, 'A', 1, 'romance'],
    [60012, 30007, "Hearts & Souls", 0, 1, 'T', 0, ''],
    
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
    [60022, 30018, "Campus Life", 0, 1, 'T', 0, ''],
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
    [60030, 30025, "Gaming Paradise", 0, 1, 'T', 0, ''],
    
    // MUSIC (30027)
    [60031, 30027, "Rock Legends", 0, 1, 'A', 0, ''],
    [60032, 30027, "Jazz Lounge", 0, 0, 'G', 0, ''],
    
    // MISCELLANEOUS (30028)
    [60033, 30028, "Random Thoughts", 0, 1, 'G', 0, ''],
    [60034, 30028, "Late Night Diner", 0, 0, 'A', 0, ''],
    
    // ADULT ORIENTED (30029)
    [60035, 30029, "Adults Only", 0, 1, 'A', 1, 'adults'],
    [60036, 30029, "Mature Discussions", 0, 0, 'A', 0, '']
  ];

  // Check if rooms already exist
  db.get("SELECT COUNT(*) as count FROM groups WHERE id >= 60001 AND id <= 60036", (err, row) => {
    if (err) {
      console.error("Error checking existing rooms:", err.message);
      db.close();
      return;
    }

    if (row.count > 0) {
      console.log(`⚠️  ${row.count} new rooms already exist. Skipping insertion.`);
      console.log("✅ Database is up to date!");
      db.close();
      return;
    }

    // Insert new rooms
    const stmt = db.prepare(`
      INSERT INTO groups (id, catg, nm, owner, v, r, l, password) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let failed = 0;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      newRooms.forEach((room, index) => {
        stmt.run(room, (err) => {
          if (err) {
            console.error(`❌ Failed to insert room ${room[2]}:`, err.message);
            failed++;
          } else {
            inserted++;
            console.log(`✅ Added: ${room[2]} (${room[4] ? 'Voice' : 'Text'}) - ${room[5]} rated`);
          }

          // If this is the last room, finalize
          if (index === newRooms.length - 1) {
            stmt.finalize();
            
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("Error committing transaction:", err.message);
                db.run("ROLLBACK");
              } else {
                console.log(`\n🎉 Migration complete!`);
                console.log(`📊 Results: ${inserted} rooms added, ${failed} failed`);
                console.log(`\n📋 Summary:`);
                console.log(`- Voice rooms: ${newRooms.filter(r => r[4] === 1).length}`);
                console.log(`- Text rooms: ${newRooms.filter(r => r[4] === 0).length}`);
                console.log(`- Password protected: ${newRooms.filter(r => r[6] === 1).length}`);
                console.log(`- G-rated: ${newRooms.filter(r => r[5] === 'G').length}`);
                console.log(`- A-rated: ${newRooms.filter(r => r[5] === 'A').length}`);
                console.log(`- T-rated: ${newRooms.filter(r => r[5] === 'T').length}`);
              }
              
              db.close();
            });
          }
        });
      });
    });
  });
});
