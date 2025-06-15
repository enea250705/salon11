const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up your app for local development...\n');

// Create a proper .env file
const envContent = `# Database Configuration
# Replace this with your actual database URL from Neon/Supabase
DATABASE_URL=postgresql://your-username:your-password@your-host:5432/your-database

# JWT Secret (for authentication)
JWT_SECRET=super-secret-local-development-key-change-in-production

# Development Mode
NODE_ENV=development

# Optional: Email configuration (for notifications)
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
`;

fs.writeFileSync('.env', envContent);

console.log('✅ Created .env file');
console.log('\n📝 Next steps:');
console.log('1. Get a free database from:');
console.log('   - https://neon.tech (PostgreSQL)');
console.log('   - https://supabase.com (PostgreSQL)');
console.log('');
console.log('2. Replace the DATABASE_URL in your .env file');
console.log('');
console.log('3. Run: npm run dev');
console.log('');
console.log('🎯 Your app will be available at: http://localhost:5000'); 