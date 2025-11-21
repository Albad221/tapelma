/**
 * Quick Supabase Connection Test
 * Run with: node test-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase Connection...\n');

// Load credentials from .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

console.log('Configuration:');
console.log('  URL:', SUPABASE_URL);
console.log('  Key:', SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('Testing database connection...\n');

  try {
    // Test 1: Check if we can query the database
    console.log('Test 1: Checking database connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "users" does not exist')) {
        console.log('⚠️  Database connected, but tables not created yet');
        console.log('   👉 Run the database schema in Supabase SQL Editor');
        console.log('   👉 See SUPABASE_SETUP.md for instructions\n');
        return;
      }
      throw error;
    }

    console.log('✅ Database connection successful!');
    console.log('✅ Users table exists\n');

    // Test 2: Check other tables
    console.log('Test 2: Checking other tables...');
    const tables = [
      'conversation_sessions',
      'work_experiences',
      'education',
      'skills',
      'certifications',
      'generated_documents',
      'message_logs',
      'cv_templates'
    ];

    let allTablesExist = true;
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (tableError) {
        console.log(`❌ Table "${table}" not found`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    }

    if (!allTablesExist) {
      console.log('\n⚠️  Some tables are missing');
      console.log('   👉 Run the complete schema in Supabase SQL Editor');
      console.log('   👉 File: database/schema.sql\n');
      return;
    }

    console.log('\n✅ All tables exist!\n');

    // Test 3: Count existing records
    console.log('Test 3: Checking existing data...');
    const { data: users } = await supabase.from('users').select('count');
    const { data: sessions } = await supabase.from('conversation_sessions').select('count');
    const { data: messages } = await supabase.from('message_logs').select('count');

    console.log(`  Users: ${users?.[0]?.count || 0}`);
    console.log(`  Sessions: ${sessions?.[0]?.count || 0}`);
    console.log(`  Messages: ${messages?.[0]?.count || 0}`);

    console.log('\n🎉 Supabase is fully configured and ready!\n');
    console.log('Next steps:');
    console.log('  1. Add other API credentials to .env (OpenAI, WATI, etc.)');
    console.log('  2. Run: npm run start:dev');
    console.log('  3. Test the webhook endpoint\n');

  } catch (error) {
    console.error('\n❌ Error testing connection:');
    console.error(error.message);
    console.error('\nPossible issues:');
    console.error('  - Incorrect service role key');
    console.error('  - Database schema not created');
    console.error('  - Network connectivity issues');
    console.error('\nSee SUPABASE_SETUP.md for help\n');
    process.exit(1);
  }
}

// Run the test
testConnection();
