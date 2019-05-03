// server.js
// where your node app starts

// init project
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
  //console.log("Kill");
  if(eventData['payload'] != undefined) {
    var headshot = eventData['payload']['is_headshot'] == 1 ? 'true' : 'false';
    //console.log(eventData['payload']['attacker_character_id'] + " killed " + eventData['payload']['character_id'] + ". Headshot: " + headshot);
  }
}

const loginsConnection = new WebSocket(url);

loginsConnection.onopen = () => {
  loginsConnection.send('{"service":"event","action":"subscribe","worlds":["all"],"eventNames":["PlayerLogin","PlayerLogout"]}');
}

loginsConnection.onerror = error => {
  console.log('WebSocket error: ${error}');
}

loginsConnection.onmessage = e => {
  var eventData = JSON.parse(e.data);
  if(eventData['payload'] != undefined) {
    var sql = 'SELECT * FROM player WHERE player_id=' + eventData['payload']['character_id'];
    sqlConnection.query(sql, function(err, result) {
      if (err) throw err
        apiRequest('http://census.daybreakgames.com/s:sealith/get/ps2:v2/character/?character_id=' + eventData['payload']['character_id'], function(error, response, body) {
          var playerData = JSON.parse(body);
          
          
          if (playerData['returned'] == 1) {
            var char = playerData['character_list'][0];
            var lastLoginDate = (Math.floor(char['times']['last_login'] / 86400));
            var curDateNum = Math.floor(Math.floor(Date.now() / 1000) / 86400) 
            if (curDateNum != lastLoginDate) {
              sql = 'Select * from unique_daily_logins where day_num = ' + curDateNum;
              sqlConnection.query(sql, function(err, result) {
                if (result.length == 0) {
                  sqlConnection.query('insert into unique_daily_logins (day_num, number_uniques) values (' + curDateNum + ',1)', function(err, result) {});
                } else {
                  sqlConnection.query('update unique_daily_logins set number_uniques = ' + (result[0]['number_uniques'] + 1) + ' where day_num = ' + curDateNum + '', function(err, result) {
                    if (err) throw err;
                  });
                }
              })
            }
            if (result.length == 0) {
              //console.log('New player');
              var newPlayerFields = 'player_id,player_name,player_name_lower,faction_id,head_id,title_id,creation_time,last_save_time,last_login_time,login_count,minutes_played,earned_certs,gifted_certs,spent_certs,available_certs,percent_to_next_cert,battle_rank,percent_to_next_rank,profile_id,daily_ribbon_count,prestige_level';

              var newPlayerValues = char['character_id'] +
                  ',"' + char['name']['first'] + '"' +
                  ',"' + char['name']['first_lower']  + '"' +
                  ',' + char['faction_id'] +
                  ',' + char['head_id'] +
                  ',' + char['title_id'] +
                  ',' + char['times']['creation'] +
                  ',' + char['times']['last_save'] + 
                  ',' + char['times']['last_login'] +
                  ',' + char['times']['login_count'] +
                  ',' + char['times']['minutes_played'] +
                  ',' + char['certs']['earned_points'] + 
                  ',' + char['certs']['gifted_points'] + 
                  ',' + char['certs']['spent_points'] + 
                  ',' + char['certs']['available_points'] + 
                  ',' + char['certs']['percent_to_next'] + 
                  ',' + char['battle_rank']['value'] + 
                  ',' + char['battle_rank']['percent_to_next'] + 
                  ',' + char['profile_id']+ 
                  ',' + char['daily_ribbon']['count'] +
                  ',' + char['prestige_level'];
              //console.log(newPlayerValues);
              var newPlayerSql = 'INSERT INTO player (' + newPlayerFields + ') VALUES (' + newPlayerValues + ')';
              //console.log('INSERT INTO player (' + newPlayerFields + ') VALUES (' + newPlayerValues + ')');
              sqlConnection.query(newPlayerSql, function(err , result) {
                if (err) throw err
              })
              //console.log(newPlayerSql);
            } else {
              //console.log("Retrning player");
              var returnPlayerSql = 'UPDATE player SET ' +
                  'title_id = ' + char['title_id'] + ', ' + 
                  'last_save_time = ' + char['times']['last_save'] + ', ' +
                  'last_login_time = ' + char['times']['last_login'] + ', ' +
                  'login_count = ' + char['times']['login_count'] + ', ' +
                  'minutes_played = ' + char['times']['minutes_played'] + ', ' +
                  'earned_certs = ' + char['certs']['earned_points'] + ', ' +
                  'gifted_certs = ' + char['certs']['gifted_points'] + ', ' +
                  'spent_certs = ' + char['certs']['spent_points'] + ', ' +
                  'available_certs = ' + char['certs']['available_points'] + ', ' +
                  'percent_to_next_cert = ' + char['certs']['percent_to_next'] + ', ' +
                  'battle_rank = ' + char['battle_rank']['value'] + ', ' +
                  'percent_to_next_rank = ' + char['battle_rank']['percent_to_next']  + ', ' +
                  'profile_id = ' + char['profile_id'] + ', ' +
                  'daily_ribbon_count = ' + char['daily_ribbon']['count'] + ', ' +
                  'prestige_level = ' + char['prestige_level'] +
                  ' WHERE player_id = ' + char['character_id'];
              //console.log(returnPlayerSql);
            }
          }
        })
      
    })
    //console.log(eventData['payload']['event_name']);
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
