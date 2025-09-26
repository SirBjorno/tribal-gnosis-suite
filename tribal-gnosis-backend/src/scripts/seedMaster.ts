import { Tenant, User } from '../models';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/database';

export async function seedMasterUser(exitProcess = false) {
  try {
    await connectDB();

    // Create master tenant
    const masterTenant = await Tenant.findOneAndUpdate(
      { companyCode: process.env.MASTER_COMPANY_CODE },
      {
        name: 'Tribal Gnosis Master',
        domain: 'tribal-gnosis.com',
        companyCode: process.env.MASTER_COMPANY_CODE,
        settings: {
          maxUsers: 999999,
          maxStorage: 999999,
          features: {
            transcription: true,
            analysis: true,
            knowledgeBase: true
          }
        }
      },
      { upsert: true, new: true }
    );

    // Create master user if it doesn't exist
    const masterEmail = process.env.MASTER_EMAIL || 'master@tribal-gnosis.com';
    const existingMaster = await User.findOne({ email: masterEmail });

    if (!existingMaster) {
      const hashedPassword = await bcrypt.hash(process.env.MASTER_PASSWORD || 'TribalGnosis2025!', 10);
      
      await User.create({
        name: 'Master Admin',
        email: masterEmail,
        password: hashedPassword,
        role: 'master',
        tenantId: masterTenant._id,
        active: true
      });

      console.log('Master user created successfully');
    } else {
      console.log('Master user already exists');
    }

    console.log('Seed completed successfully');
    if (exitProcess) {
      process.exit(0);
    }
    return true;
  } catch (error) {
    console.error('Seed error:', error);
    if (exitProcess) {
      process.exit(1);
    }
    throw error;
  }
}

// Only run seeding if this file is being executed directly
if (require.main === module) {
  seedMasterUser(true);
}