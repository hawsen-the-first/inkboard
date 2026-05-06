import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/inkboard';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI ?? DEFAULT_URI;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(mongoUri);
      console.log(`MongoDB connected on attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection failed on attempt ${attempt}`, error);

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      await wait(RETRY_DELAY_MS);
    }
  }
};
