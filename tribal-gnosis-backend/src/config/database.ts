import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB successfully');
    console.log('Database URL:', dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')); // Log URL without credentials

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