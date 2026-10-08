const { initSupabase, getSupabase, isSupabaseConnected } = require('./supabase');

/**
 * Connect to database (Supabase PostgreSQL)
 */
const connectDB = async () => {
  return await initSupabase();
};

module.exports = connectDB;
module.exports.initSupabase = initSupabase;
module.exports.getSupabase = getSupabase;
module.exports.isSupabaseConnected = isSupabaseConnected;
