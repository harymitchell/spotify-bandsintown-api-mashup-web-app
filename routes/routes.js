var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log ("Getting index for user: "+ JSON.stringify(req.session.user))
  res.render('index', { title: 'Show Finder', user: req.session.user });
});

/* GET Logout. */
router.get('/logout', function(req, res, next) {
  console.log ("Logging out for user: "+ JSON.stringify(req.session.user))
  req.session.user = null
  res.redirect ('/')
});

module.exports = router;
