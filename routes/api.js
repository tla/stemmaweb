var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var fetch = require('node-fetch');
// Figure out how to do this properly
// require('dotenv').config();
const STEMMAREST_ENDPOINT = 'http://localhost:8080/stemmarest'

/* Handle any request starting with /api */
router.all('/*', (req, res) => {
  const baseurl = STEMMAREST_ENDPOINT + "/";
  console.log(baseurl);
  const params = {
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  };
  const url = req.params[0];
  console.log(req.method + " " + url);
  console.log(req.body);
  if (req.body && Object.keys(req.body).length) {
    params.body = JSON.stringify(req.body);
  }

  fetch(baseurl + url, params)
    .then(response => {
      console.log("Response: " + response.status);
      // Duplicate the status code and the response content
      res.status(response.status);
      // Pass through the appropriate content headers
      const headerObj = response.headers.raw();
      for (let h of Object.keys(headerObj)) {
        console.log("Header " + h + ": " + headerObj[h]);
        if (h.startsWith('content')) {
          const parts = headerObj[h];
          console.log(parts);
          res.append(h, parts[0]);
        }
      }
      // Pass through the response body
      return response.text();
    })
    .then(body => res.send(body))
    .catch(error => res.status(500).json({
      error: error.message
    }));
});

module.exports = router;
