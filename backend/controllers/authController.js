const bcrypt = require('bcryptjs');
const { getSupabase, isSupabaseConnected } = require('../config/supabase');
const generateToken = require('../utils/generateToken');
const mockStore = require('../utils/mockStore');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If Supabase PostgreSQL is connected
    if (isSupabaseConnected()) {
      const supabase = getSupabase();

      // Check if user already exists
      const { data: userExists, error: checkErr } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (checkErr) {
        throw checkErr;
      }

      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists',
        });
      }

      // Hash password using bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
        })
        .select('id, name, email, created_at')
        .single();

      if (insertErr) {
        throw insertErr;
      }

      const token = generateToken(newUser.id);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: {
          _id: newUser.id,
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          createdAt: newUser.created_at,
          token,
        },
      });
    }

    // Resilient in-memory fallback if Supabase is not connected
    const existing = mockStore.users.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      _id: 'user-' + Date.now(),
      id: 'user-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date(),
    };

    mockStore.users.push(newUser);

    // Seed sample tasks for this user so they have initial data to explore
    mockStore.tasks.forEach((t) => {
      if (t.userId === 'sample-user-id') {
        t.userId = newUser.id;
      }
    });

    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully (Memory Storage Mode)',
      data: {
        _id: newUser.id,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If Supabase PostgreSQL is connected
    if (isSupabaseConnected()) {
      const supabase = getSupabase();

      const { data: user, error: findErr } = await supabase
        .from('users')
        .select('id, name, email, password, created_at')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (findErr) {
        throw findErr;
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const token = generateToken(user.id);

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          _id: user.id,
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
          token,
        },
      });
    }

    // In-memory fallback if Supabase is not connected
    const user = mockStore.users.find((u) => u.email === cleanEmail);
    if (!user) {
      // Auto-register demo account if demo credentials are used
      if (cleanEmail === 'demo@example.com' && password === 'password123') {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        const demoUser = {
          _id: 'demo-user-1',
          id: 'demo-user-1',
          name: 'Demo Student',
          email: 'demo@example.com',
          password: hashed,
          createdAt: new Date(),
        };
        mockStore.users.push(demoUser);
        mockStore.tasks.forEach((t) => (t.userId = demoUser.id));
        const token = generateToken(demoUser.id);
        return res.status(200).json({
          success: true,
          message: 'Demo login successful',
          data: {
            _id: demoUser.id,
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            createdAt: demoUser.createdAt,
            token,
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user.id || user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        _id: user.id || user._id,
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        _id: req.user.id || req.user._id,
        id: req.user.id || req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.created_at || req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
