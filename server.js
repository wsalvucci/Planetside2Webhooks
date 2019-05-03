// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
var WebSocket = require('ws');

const url = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:sealith';
const connection = new WebSocket(url);

connection.onopen = () => {
  connection.send('{"service":"event","action":"subscribe","characters":["all"],"eventNames":["Death"],"worlds":["1"],"logicalAndCharactersWithWorlds":true}');
}

connection.onerror = error => {
  console.log('WebSocket error: ${error}');
}

connection.onmessage = e => {
  //console.log(e.data);
  var eventData = JSON.parse(e.data);
  //console.log(eventData);
  if(eventData['detail'] != undefined) {
    console.log(eventData['detail'] + ' : ' + eventData['online']);
  }
  if(eventData['payload'] != undefined) {
    var headshot = eventData['payload']['is_headshot'] == 1 ? 'true' : 'false';
    console.log(eventData['payload']['attacker_character_id'] + " killed " + eventData['payload']['character_id'] + ". Headshot: " + headshot);
    //console.log(eventData);
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
