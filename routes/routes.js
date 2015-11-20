var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.session.user && req.session.user.display_name) console.log ("Getting index for user: "+ JSON.stringify(req.session.user.display_name))
  res.render('index', { title: 'The Show Spot', user: req.session.user });
});

/* GET Logout. */
router.get('/logout', function(req, res, next) {
  if (req.session.user && req.session.user.display_name) console.log ("Loggin out for user: "+ JSON.stringify(req.session.user.display_name))
  req.session.user = null
  res.redirect ('/')
});

/* GET About. */
router.get('/about', function(req, res, next) {
  res.render ('about', { title: 'The Show Spot', user: req.session.user });
});

module.exports = router;
