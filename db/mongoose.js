const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn('MongoDB URI is not defined in the environment variables. The server will start, but database operations will fail.');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB cluster.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
