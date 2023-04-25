var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

var app = express(); 

// set up gzip compression
app.use(compression());

// set up helmet
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      // we need these directives since bootstrap uses them to pull up a compiled version
      // from their CDN.
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdeliver.net"], 
    }
  })
);

// set up express rate limit
const RateLimit = require('express-rate-limit');
const limiter = RateLimit({
  windowMS: 1 * 60 * 1000, // 1 minute converted to ms
  max: 20, // maximum number of requests per minute
})
// mount the rate limit middleware
app.use(limiter);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const Database = require('./bin/Database.js');

// Routers 
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const catalogRouter = require('./routes/catalog');

// API endpoints
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
