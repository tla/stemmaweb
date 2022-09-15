var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Stemmaweb' });
});


router.get('/index_t', function(req, res, next) {
  res.render('index_t', { title: 'Stemmaweb' });
});

/* GET color scheme - dev purposes. */
router.get('/color_scheme', function(req, res, next) {
  res.render( 'color_scheme', { title: 'StemmaWeb | Color Scheme' });
});

/* GET scratchpad - dev purposes. */
router.get('/scratchpad', function(req, res, next) {
  res.render( 'scratchpad', { title: 'StemmaWeb | Developer\'s Scratchpad' });
});

module.exports = router;
