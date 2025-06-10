# Salon Management System - Serverless

A fully serverless salon/beauty appointment management system built with React, TypeScript, and serverless functions. Optimized for Vercel deployment with JWT authentication and PostgreSQL database.

## Features

- **Serverless Architecture**: Fully serverless with Vercel Functions
- **JWT Authentication**: Stateless authentication with secure tokens
- **Appointment Management**: Easy appointment scheduling with dropdown time selectors
- **Staff Management**: Complete staff and stylist management
- **Service Management**: Service catalog with pricing
- **Client Management**: Customer database with search
- **Italian Interface**: Fully localized in Italian
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon/PlanetScale recommended)
- **Authentication**: JWT tokens
- **Deployment**: Vercel

## Deployment to Vercel

### 1. Prerequisites

- Vercel account
- PostgreSQL database (Neon, PlanetScale, or Supabase)
- Environment variables

### 2. Environment Variables

Create these environment variables in your Vercel project:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Optional: Email configuration
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 3. Deploy to Vercel

#### Method 1: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET

# Deploy with environment variables
vercel --prod
```

#### Method 2: GitHub Integration
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### 4. Database Setup

The database will be automatically set up when you first deploy. The system includes:

- Users table with admin account
- Services (Taglio, Colore, Piega, etc.)
- Default stylist (Giulia)
- Sessions table for JWT management

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change the default password after first login!**

## Project Structure

```
├── api/                    # Serverless functions
│   ├── auth/              # Authentication endpoints
│   ├── appointments/      # Appointment management
│   ├── clients/          # Client management
│   ├── services/         # Service management
│   ├── stylists/         # Stylist management
│   ├── dashboard/        # Dashboard stats
│   └── lib/              # Shared utilities
├── client/               # React frontend
├── shared/              # Shared types and schemas
├── vercel.json          # Vercel configuration
└── drizzle.config.ts    # Database configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/user` - Get current user info

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments?date=YYYY-MM-DD` - Get appointments by date

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service (admin only)

### Stylists
- `GET /api/stylists` - List stylists
- `POST /api/stylists` - Create stylist (admin only)

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients?search=query` - Search clients

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Features Explained

### Simplified Appointment Creation
- Just enter client name (automatically creates client)
- Select service and stylist from dropdowns
- Choose time with easy hour/minute dropdowns (8 AM - 6 PM, 15-min intervals)
- End time calculated automatically based on service duration

### JWT Authentication
- Stateless authentication perfect for serverless
- Tokens stored in localStorage and HTTP-only cookies
- Automatic token validation on protected routes

### Database Optimization
- Optimized connection pooling for serverless
- Single connection per function invocation
- Automatic connection cleanup

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database connectivity
   - Ensure SSL is enabled for production databases

2. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration (7 days default)
   - Clear localStorage if tokens are corrupted

3. **Deployment Issues**
   - Verify all environment variables are set
   - Check Vercel function logs
   - Ensure database is accessible from Vercel

### Environment Variable Format
```bash
# Correct PostgreSQL URL format
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# For Neon
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/database?sslmode=require

# For PlanetScale
DATABASE_URL=mysql://user:password@aws.connect.psdb.cloud/database?ssl={"rejectUnauthorized":true}
```

## Security Notes

- JWT tokens expire after 7 days
- Passwords are bcrypt hashed
- Database connections use SSL
- CORS properly configured
- Input validation on all endpoints

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify environment variables
3. Check Vercel function logs
4. Review database connectivity

## License

MIT License - see LICENSE file for details.