const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Import simple API routes
const apiRoutes = require('./simple-api.js');
app.use(apiRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`h2ktalk.fun server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
});