const session = require('express-session');
require('dotenv').config()
const session_secret=process.env.SESSION_SECRET

const sessionMiddleware=session({
    secret: session_secret, // Make sure to use a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set 'secure: true' if using HTTPS
  });

  module.exports = sessionMiddleware;