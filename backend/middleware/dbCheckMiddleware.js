const { isSupabaseConnected } = require('../config/supabase');

const checkDbConnection = (req, res, next) => {
  if (!isSupabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Supabase PostgreSQL is currently not connected. Please verify your SUPABASE_URL and SUPABASE_KEY in .env.',
      tip: 'You can create a free project at https://supabase.com and run supabase_schema.sql in the SQL Editor.',
    });
  }
  next();
};

module.exports = checkDbConnection;
