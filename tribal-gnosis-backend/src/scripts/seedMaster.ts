import { Tenant, User } from '../models';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/database';

async function seedMasterUser() {
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

    // Create or update master user
    const masterEmail = process.env.MASTER_EMAIL || 'master@tribal-gnosis.com';
    const hashedPassword = await bcrypt.hash(process.env.MASTER_PASSWORD || 'TribalGnosis2025!', 12);
    
    const masterUser = await User.findOneAndUpdate(
      { email: masterEmail },
      {
        name: 'Master Admin',
        email: masterEmail,
        password: hashedPassword,
        role: 'master',
        tenantId: masterTenant._id,
        active: true
      },
      { upsert: true, new: true }
    );

    console.log(`Master user ${masterUser.isNew ? 'created' : 'updated'} successfully:`, masterEmail);

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedMasterUser();