import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/QLTT";

async function migratePasswords() {
  try {
    await mongoose.connect(uri, { dbName: 'QLTT' });
    console.log('Connected to MongoDB');

    const Account = mongoose.model('Account', new mongoose.Schema({
      id: String,
      name: String,
      email: String,
      password: String,
      role: String,
      status: String
    }, { timestamps: true }));

    // Find all accounts with plain text passwords
    const accounts = await Account.find({
      password: { $not: /^\$2[ab]\$/ } // Not starting with $2a$ or $2b$
    });

    console.log(`Found ${accounts.length} accounts with plain text passwords`);

    for (const account of accounts) {
      console.log(`Hashing password for account: ${account.email}`);
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(account.password, salt);
      
      await Account.updateOne(
        { _id: account._id },
        { password: hashedPassword }
      );
      
      console.log(`✓ Updated password for ${account.email}`);
    }

    console.log('Password migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePasswords();
