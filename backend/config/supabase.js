const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let isConnected = false;
let connectionAttempted = false;

/**
 * Initialize Supabase client and test connectivity
 */
const initSupabase = async () => {
  connectionAttempted = true;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('your-project') ||
    supabaseKey.includes('your-supabase') ||
    !supabaseUrl.startsWith('http')
  ) {
    console.log(`
==================================================
⚠️  SUPABASE SETUP NOTICE:
Supabase environment variables (SUPABASE_URL, SUPABASE_KEY) are either missing
or set to placeholder values in your .env file.

Running in RESILIENT IN-MEMORY STORAGE MODE so the app remains fully functional!

To connect your Supabase PostgreSQL cloud database:
1. Create a free project at: https://supabase.com
2. Copy the SQL from 'supabase_schema.sql' and run it in the Supabase SQL Editor.
3. In Project Settings -> API, copy Project URL & service_role secret / anon key.
4. Add them to your .env file:
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-key
==================================================
`);
    isConnected = false;
    return null;
  }

  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Test connectivity by querying users table
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.warn(`
⚠️  Connected to Supabase, but the 'users' table was not found!
   Please run the 'supabase_schema.sql' script in your Supabase SQL Editor.
`);
      } else {
        console.warn(`⚠️  Supabase connectivity check warning: ${error.message}`);
      }
      isConnected = false;
      return null;
    }

    isConnected = true;
    console.log(`✅ Supabase PostgreSQL Connected Successfully: ${supabaseUrl}`);
    return supabase;
  } catch (error) {
    console.error(`❌ Supabase Connection Error: ${error.message}`);
    isConnected = false;
    return null;
  }
};

/**
 * Get active Supabase client instance
 */
const getSupabase = () => supabase;

/**
 * Check if Supabase is connected and ready
 */
const isSupabaseConnected = () => isConnected && supabase !== null;

module.exports = {
  initSupabase,
  getSupabase,
  isSupabaseConnected,
};
