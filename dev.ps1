# Set environment variables for development
$env:DATABASE_URL = "postgresql://neondb_owner:npg_cRIHzEfVNj91@ep-weathered-sky-a8ubfxtz-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
$env:NODE_ENV = "development"

# Start the development servers
Write-Host "🚀 Starting Salon Management System (Serverless)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API: http://localhost:3000" -ForegroundColor Cyan

npm run dev 