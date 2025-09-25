import mongoose from 'mongoose';
import { join } from 'path';
import { config } from 'dotenv';

config();

export async function connectDB() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB successfully');

    // Create indexes on startup
    await Promise.all([
      mongoose.model('Tenant').createIndexes(),
      mongoose.model('User').createIndexes(),
      mongoose.model('KnowledgeItem').createIndexes()
    ]);
    console.log('Database indexes ensured');

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});