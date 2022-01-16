var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Stemmaweb' });
});


/* GET color scheme - dev purposes. */
router.get('/color_scheme', function(req, res, next) {
  res.render( 'color_scheme', { title: 'StemmaWeb | Color Scheme' });
});

module.exports = router;
