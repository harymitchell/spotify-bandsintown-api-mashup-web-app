var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session      = require('express-session');
var async = require("async");
var cities = require('cities');
var geolib = require('geolib')
var url = require('url')

// AUTH
var client_id = '67deffe54f754dddb1674a6650fccd6b'; // Your client id
var client_secret = '50e0fd148a574abe9fd6331c364b9261'; // Your client secret

if (process.env.NODE_DEV == 'true') {
  console.log ("Staring server in development mode...")
  var redirect_uri = 'http://localhost:'+(process.env.PORT || '3000')+'/callback'; // Your redirect uri
}
else{
  var redirect_uri = 'https://safe-sands-4304.herokuapp.com/callback';
}

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
// var server = app.listen(process.env.PORT || 8888)

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
app.post('/search', function(req, res, next) {
  getSpotifyArtists(req, res, function(){
    console.log("redirecting...")  
    res.send({})
  })
});


function getSpotifyArtists(req, res, callback){
  // Get Spotify artists for session user.
  if (req.session.user) {
    if (req.session.user.last_artists && req.session.user.last_artists.length > 0){
      console.log ("Using cached spotify artists.")
      getSpotifyArtistsEventsFromBandsintown (req.session.user.last_artists, req, res, callback)      
    }else{
      // Gather artists from Spotify API.
      var refresh_token = req.session.refresh_token
      var access_token = req.session.access_token
      req.session.user.last_artists = []
      console.log ("Searching for user: "+ JSON.stringify(req.session.user).display_name)
      var artistOptions = {
        url: 'https://api.spotify.com/v1/me/following?type=artist',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };
      var trackOptions = {
        url: 'https://api.spotify.com/v1/me/tracks',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };
      var playlistOptions = {
        url: 'https://api.spotify.com/v1/users/'+req.session.user.id+'/playlists',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };
      // Gather spotify artists.
      async.series([
        function(cb){ // Gather followed artists
          request.get(artistOptions, function(error, response, body) {
            // console.log ("Found "+body.artists.items.length+" followed artists.")
            // console.log (body.artists)
            req.session.user.last_artists = req.session.user.last_artists.concat (body.artists.items)
            console.log ("req.session.user.last_artists="+JSON.stringify(req.session.user.last_artists))
            cb()
          });
        }
        ,function(cb){ // Gather saved tracks
          request.get(trackOptions, function(error, response, body) {
            addToArtistsFromTracks (req, body.items, cb)
          });
        }
        ,function(cb){ // Gather all tracks from playlists.
          request.get(playlistOptions, function(error, response, body) {
            var i,j;
            var playlistTrackOptions = {
              url: '',
              headers: { 'Authorization': 'Bearer ' + access_token },
              json: true
            };
            console.log ("found playlists: "+JSON.stringify(body.items))
            var c = 0
            var qlen = body.items.length
            for (i=0;i<body.items.length;i++){
              playlistTrackOptions.url = body.items[i].tracks.href
              console.log('href: '+playlistTrackOptions.url)
              request.get(playlistTrackOptions, function(error, response, body) { // gather all artists from tracks in playlist
                c += 1
                console.log ('c: '+c+', qlen: '+qlen)
                if(c == qlen){
                  console.log('with callback')
                  addToArtistsFromTracks (req, body.items, cb)
                }else{
                  addToArtistsFromTracks (req, body.items, null)                  
                }
              });
            }
            // console.log ("req.session.user.last_artists="+JSON.stringify(req.session.user.last_artists))
          });
        }
        ],
        // optional callback
        function(err, results){
          console.log ("callback series")
          getSpotifyArtistsEventsFromBandsintown (req.session.user.last_artists, req, res, callback)
        }
      );
    }
  }else{
    // TODO flash that log-in is required.
    callback()   
  }
}

function addToArtistsFromTracks (req, tracks, cb){
  // Add to artists tracks from req with trackOptions.
  var i,j;
  console.log ("found "+tracks.length+" tracks: ")//+JSON.stringify(tracks))
  for (i=0;i<tracks.length;i++){
    for (j=0;j<tracks[i].track.artists.length;j++){
      if (req.session.user.last_artists.indexOf(tracks[i].track.artists[j])==-1){
        req.session.user.last_artists = req.session.user.last_artists.concat (tracks[i].track.artists[j])
      }
    }
  }
  // console.log ("artists="+JSON.stringify(req.session.user.last_artists))
  if(cb) {
    console.log ("addToArtistsFromTracks calling back")
    cb()
  }else{
    console.log("no callback")
  }
}

function getSpotifyArtistsEventsFromBandsintown(artists, req, res, callback){
  var zipCode = cities.zip_lookup(req.body.zip)
  if (req.session.user && req.session.user.cached_events){
    console.log("using cached events for user")
    req.session.user.last_events = filteredBandsintownEvents(req, req.session.user.cached_events, zipCode)
    callback()
  }else{
    var bandsintown_url_head = 'http://api.bandsintown.com/artists/'
    var bandsintown_url_tail = '/events.json?api_version=2.0&app_id=showfinderplusbetadev'+encodeURIComponent(generateRandomString(4))
    var bandsintown_events = []
    req.session.user.cached_events = []
    // console.log ("in getSpotifyArtistsEventsFromBandsintown for "+artists)
    // Asnchronous loop.
    async.each(
      artists, // List of spotify artists to iterate
      function(artist, cb){ // Function to call on each item.
        // console.log ("looping for spotify artist: "+artist)
        var url_encoded = bandsintown_url_head+encodeURIComponent(artist['name'])+bandsintown_url_tail
        console.log ("encoded uri: "+url_encoded)
        request.get(url_encoded, function(error, response, body){
            if (error) {
              console.log ("bandsintown artist callback err: "+error)
            }else{
              // var bandsintown_events_json = JSON.parse(body)
              var body_json = JSON.parse(body)
              // Cache events, to avoid rate limiting
              req.session.user.cached_events = req.session.user.cached_events.concat(body_json)
              // console.log ("bandsintown artist callback for body of length: "+body_json.length)
              bandsintown_events = bandsintown_events.concat(filteredBandsintownEvents(req, body_json, zipCode))
            }
            cb() // required for call to return!
        });
      },
      function(err){ // Callback when all asynch calls return.
        console.log ("return callback")
        if (err){
          console.error ("Error: "+err)
        }else{
          // console.log ("bandsintown_events: "+JSON.stringify(bandsintown_events))
          console.log ("all asynch calls in getSpotifyArtistsEventsFromBandsintown have returned")
          req.session.user.last_events = bandsintown_events
          callback()
        }
      }
    ); // end async.each
  }
}

function filteredBandsintownEvents(req, events, zipCode){
  var result = [] // to return 
  var i = 0;
  // console.log ("enter filteredBandsintownEvents")
  for (i=0;i<events.length;i++){
    if (req.body && req.body.zip && req.body.radius && zipCode && result.indexOf(events[i]) == -1){
      var dist;
      // console.log ('before geo '+i)
      dist = geolib.getDistance(events[i].venue,zipCode)*0.000621371; // miles
      // console.log ('after geo '+i)
      // console.log ('dist='+dist)
      // console.log ('rad='+req.body.radius)
      if (req.body.radius >= dist) {
        result.push (events[i])
      }
    }else if(result.indexOf(events[i]) == -1){  
      result.push (events[i])
    }else{
      console.log ("duplicate event: "+JSON.stringify(events[i]))
    }
  }
  console.log ("exit filteredBandsintownEvents")
  return result
}


// NOTE: I have had problems with rate limiting, so putting JamBase on hold.

// function getSpotifyArtistsFromJameBase(artists, req, res, callback){
//   // Get jamebase artists from Spotify artists.
//   var jamebase_url_head = 'http://api.jambase.com/artists?name='
//   var jamebase_url_tail = '&page=0&api_key=2cmgm277bcufb5v9vn7xv823'
//   var jb_artists = []
//   console.log ("in getSpotifyArtistsFromJameBase for artists: "+JSON.stringify(artists))
//   // Asnchronous loop.
//   async.each(
//     artists.items, // List of artists to iterate
//     function(artist, cb){ // Function to call on each item.
//       console.log ("looping for spotify artist: "+artist)
//       setTimeout(function(){
//         request.get(jamebase_url_head+artist['name']+jamebase_url_tail, function(error, response, body){
//           if (error) {
//             console.log ("jamebase artist callback err: "+error)
//             res.redirect ('/')
//           }else{
//             console.log ("jamebase artist callback for body: "+body)
//             var json_artists = JSON.parse(body)
//             jb_artists = jb_artists.concat(json_artists)
//             console.log ("artists:"+JSON.stringify(json_artists['Artists']))
//             console.log ("artists[0]"+JSON.stringify(json_artists['Artists'][0]))
//             console.log ("artists[0][id]"+JSON.stringify(json_artists['Artists'][0]['Id']))
//           }
//         });
//       }, 3000)
//     },
//     function(err){ // Callback when all asynch calls return.
//       if (err){
//         console.error (err)
//       }else{
//         console.log ("all asynch calls have returned")
//         getJameBaseShowsForArtists (jb_artists, req, res, callback)
//       }
//     }
//   );
// }

// function getJameBaseShowsForArtists(artists, req, res, callback){
//   // Get jamebase shows for JamBase artists.
//   // ex: http://api.jambase.com/events?artistId=2698&zipCode=95128&radius=50&page=0&api_key=2cmgm277bcufb5v9vn7xv823
//   var shows = []
//   // Asnchronous loop.
//   async.each(
//     artist, // artists to loop
//     function(item, cb){
//       request.get ('http://api.jambase.com/events?artistId='+artist['Id']+'&api_key=2cmgm277bcufb5v9vn7xv823', function(error, response, body){
//         if (error) {
//           console.log ("jamebase err: "+error+" for: "+JSON.stringify(artist))
//         }else{
//           shows = shows.concat(body)
//           console.log ("jb body: "+body)
//         }
//       });
//     },
//     function(err){
//       if (err){
//         console.error (err)
//       }else{
//         console.log ("all asynch calls in getJameBaseShowsForArtists have returned")
//         callback()
//       }
//     }
//   );
// }


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
