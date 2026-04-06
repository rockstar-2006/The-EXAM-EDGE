import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty-quest');
    console.log('✅ Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n🗑️  Found ${collections.length} collections to clear:\n`);

    for (const collection of collections) {
      const coll = mongoose.connection.db.collection(collection.name);
      const count = await coll.countDocuments();
      
      if (count > 0) {
        await coll.deleteMany({});
        console.log(`✅ Cleared: ${collection.name} (removed ${count} documents)`);
      } else {
        console.log(`⏭️  Skipped: ${collection.name} (empty)`);
      }
    }

    console.log('\n🎉 All collections cleared!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

connectDB();
