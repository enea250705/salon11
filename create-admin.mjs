import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users } });

async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists. Deleting and recreating...');
      await db.delete(users).where(eq(users.username, 'admin'));
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 Password hashed successfully');
    
    // Create the admin user
    const [newAdmin] = await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@salon.com',
      role: 'admin',
      isActive: true
    }).returning();
    
    console.log('✅ Admin user created successfully!');
    console.log('📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('🆔 User ID:', newAdmin.id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser(); 