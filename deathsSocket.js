const express = require('express');
const app = express();
const WebSocket = require('ws');
const mysql = require('mysql');
const apiRequest = require('request');

var sqlConnection = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DB
});

sqlConnection.connect(function(err) {
  if (err) throw err
  console.log('Connected to database');
})

const url = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:sealith';
const deathsConnection = new WebSocket(url);

deathsConnection.onopen = () => {
  deathsConnection.send('{"service":"event","action":"subscribe","characters":["all"],"eventNames":["Death"],"worlds":["all"],"logicalAndCharactersWithWorlds":true}');
}

deathsConnection.onerror = error => {
  console.log('WebSocket error: ${error}');
}

deathsConnection.onmessage = e => {
  var eventData = JSON.parse(e.data);
  console.log(eventData);
  if(eventData['payload'] != undefined) {
    var headshot = eventData['payload']['is_headshot'] == 1 ? 'true' : 'false';
    console.log(eventData['payload']['attacker_character_id'] + " killed " + eventData['payload']['character_id'] + ". Headshot: " + headshot);
  }
}

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
