const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/serverapp';  // Replace 'myapp' with your actual database name

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
