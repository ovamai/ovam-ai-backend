require('./github');
require('./gitlab');
require('./azure');
require('./bitbucket');

{/*
const passport = require('passport');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user)).catch(err => done(err));
});


*/}
