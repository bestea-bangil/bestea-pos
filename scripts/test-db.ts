
import fs from 'fs';
import path from 'path';

// Load environment variables *before* importing anything that uses them
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Also check .env
const envPathDefault = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPathDefault)) {
   const envConfig = fs.readFileSync(envPathDefault, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function main() {
  console.log('Testing Supabase connection...');
  try {
    // Dynamic import to ensure env vars are loaded first
    const { checkDatabaseConnection } = await import('../lib/supabase/health');
    
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      console.log('✅ Database connection successful!');
    } else {
      console.log('❌ Database connection failed.');
    }
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

main();
