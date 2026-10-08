const jwt = require('jsonwebtoken');
const { getSupabase, isSupabaseConnected } = require('../config/supabase');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header: "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'taskmanager_super_secret_jwt_key_2026'
      );

      let user = null;

      if (isSupabaseConnected()) {
        const supabase = getSupabase();
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('id, name, email, created_at')
          .eq('id', decoded.id)
          .maybeSingle();

        if (dbUser && !error) {
          user = {
            _id: dbUser.id,
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            createdAt: dbUser.created_at,
          };
        }
      } else {
        const mockStore = require('../utils/mockStore');
        const found = mockStore.users.find(
          (u) => (u._id || u.id).toString() === decoded.id.toString()
        );
        if (found) {
          user = {
            ...found,
            _id: found._id || found.id,
            id: found.id || found._id,
          };
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists or session expired. Please log in again.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }
};

module.exports = { protect };
