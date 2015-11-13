var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session      = require('express-session');

// AUTH
var client_id = '67deffe54f754dddb1674a6650fccd6b'; // Your client id
var client_secret = '50e0fd148a574abe9fd6331c364b9261'; // Your client secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  /*
    This routine was borrowed from Spotify Developer Example: https://github.com/spotify/web-api-auth-examples/tree/master/authorization_code
  */
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var routes = require('./routes/routes');
var users = require('./routes/users');

var app = express();
var server = app.listen(process.env.PORT || 8888)

//Session
var sessionMiddleware = session({ 
    secret: 'shazaam',
    resave: 'false',
    saveUninitialized: 'false' }
    );
app.use(sessionMiddleware);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);


/* GET login. */
app.get('/login', function(req, res) {
  /*
    This routine was borrowed from Spotify Developer Example: https://github.com/spotify/web-api-auth-examples/tree/master/authorization_code
  */

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  /*
    This routine was borrowed from Spotify Developer Example: https://github.com/spotify/web-api-auth-examples/tree/master/authorization_code
  */
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // Access profile to set into current session.
        request.get(options, function(error, response, body) {
          console.log(body);
          req.session.user = body
          res.redirect ('/')
        });
        // Set tokens on session.
        req.session.access_token = access_token
        req.session.refresh_token = refresh_token

        // we can also pass the token to the browser to make requests from there,
        // but I dont believe that is going to be needed for my use case.
        //res.redirect('/#' +
        //  querystring.stringify({
        //    access_token: access_token,
        //    refresh_token: refresh_token
        //  }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});


/* GET Search Results. */
app.get('/search', function(req, res, next) {
  if (req.session.user) {
    var refresh_token = req.session.refresh_token
    var access_token = req.session.access_token
    console.log ("Searching for user: "+ JSON.stringify(req.session.user))
    var options = {
      url: 'https://api.spotify.com/v1/me/following?type=artist',
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };
    request.get(options, function(error, response, body) {
      console.log(body);
      req.session.user.last_artists = body.artists
      res.redirect ('/')
    });
  }else{
    // TODO flash that log-in is required.
    res.redirect ('/')    
  }
});


app.get('/refresh_token', function(req, res) {
  /*
    This routine was borrowed from Spotify Developer Example: https://github.com/spotify/web-api-auth-examples/tree/master/authorization_code
  */

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
