// db.js
const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017'; 
const dbName = 'serverapp';

let db = null;

async function connectDB() {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("Connected successfully to MongoDB server");
    } catch (error) {
        console.error("Could not connect to MongoDB", error);
    }
    return db;
}

function getDB() {
    if (!db) {
        throw new Error("DB not initialized - call connectDB first.");
    }
    return db;
}

module.exports = { connectDB, getDB };
