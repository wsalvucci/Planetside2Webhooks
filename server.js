// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const WebSocket = require('ws');
const mysql = require('mysql');
const apiRequest = require('request');
const http = require('http');


var sqlConnection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'test',
  database: 'sys'
});

sqlConnection.connect(function(err) {
  if (err) throw err
  console.log('Connected to database');
})

var heartbeat;
var sql = 'insert into heartbeat (start_timestamp, last_timestamp) values (' + Math.floor(Date.now() / 1000) + ',' + Math.floor(Date.now() / 1000) + ')';
sqlConnection.query(sql, function(err, result) {
  if (err) throw err;
  var sql2 = 'select max(heartbeat) as heartbeatIndex from heartbeat';
  sqlConnection.query(sql2, function(err2, result2) {
    if (err) throw err;
    heartbeat = result2[0].heartbeatIndex;
  })
})

setInterval(() => {
  var sql = 'update heartbeat set last_timestamp = ' + Math.floor(Date.now() / 1000) + ' where heartbeat = ' + heartbeat;
  sqlConnection.query(sql, function(err, result) { if (err) throw err })
}, 1000)

const url = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:sealith';

const vehicleDestroyConnection = new WebSocket(url);
vehicleDestroyConnection.onopen = () => {
  vehicleDestroyConnection.send('{"service":"event","action":"subscribe","worlds":["1","10","13","17","25","40"],"eventNames":["VehicleDestroy"]}');
}
vehicleDestroyConnection.onerror = error => {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
vehicleDestroyConnection.onmessage = e => {
  var eventData = JSON.parse(e.data);
  if (eventData['payload'] != undefined) {
    switch(parseInt(eventData['payload']['vehicle_id'])) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
        var id = eventData['payload']['vehicle_id'];
        var sql = 'select max(day_timestamp) as recent_day from daily_vehicle_destruction';
        var day_timestamp = (Math.floor((Date.now() / 1000) / 86400)) * 86400;
        sqlConnection.query(sql, function (err, result) {
          if (err) throw err;
          if (result[0].recent_day == null || result[0].recent_day < day_timestamp){
            var sql2 = 'insert into daily_vehicle_destruction (day_timestamp,vehicle_' + eventData['payload']['vehicle_id'] + ') values(' + day_timestamp +',1)';
          } else {
            var sql2 = 'update daily_vehicle_destruction set vehicle_' + eventData['payload']['vehicle_id'] + ' = vehicle_' + eventData['payload']['vehicle_id'] + ' + 1 where day_timestamp = ' + day_timestamp;
          }
          sqlConnection.query(sql2, function (err2, result2) {if (err) throw err})
        })
    }
  }
}


const logoutsConnection = new WebSocket(url);

logoutsConnection.onopen = () => {
  logoutsConnection.send('{"service":"event","action":"subscribe","worlds":["1","10","13","17","25","40"],"eventNames":["PlayerLogout"]}');
}

logoutsConnection.onerror = error => {
  console.log('WebSocket error: ${error}');
}

logoutsConnection.onmessage = e => {
  var eventData = JSON.parse(e.data);
  if(eventData['payload'] != undefined) {
    console.log(eventData['payload']['character_id'] + ' has logged out');
    var sql = 'update player set online = 0 where player_id = ' + eventData['payload']['character_id'];
    sqlConnection.query(sql, function(err, result) {if (err) throw err});
    sql = 'select * from player where player_id = ' + eventData['payload']['character_id'];
    sqlConnection.query(sql, function(err, result) {
      if (err) throw err;
      if (result[0] != undefined) {
        if(result[0].current_session_login_time != null) {
          if(result[0].login_count == 0) {
            var sql2 = 'insert into new_player_retention (new_player_id,login_time,logout_time,played_time) values(' + eventData['payload']['character_id'] + ',' + result[0].current_session_login_time + ',' + Math.floor(Date.now() / 1000)  +',' + (Math.floor(Date.now() / 1000)  - result[0].current_session_login_time) + ')';
            sqlConnection.query(sql2, function(err2, result2) {if (err) throw err});
            console.log('A new player played for: ' + (Math.floor(Date.now() / 1000) - result[0].current_session_login_time));
            console.log('Negative: ' + Math.floor(Date.now() / 1000) + ' - ' + result[0].current_session_login_time);
          }
          else {}
            //console.log('Player played for: ' + (eventData['payload']['timestamp'] - result[0].current_session_login_time));
        }
      } else {
        //console.log("Undefined:");
        //console.log(result);
      }
    })
    
    sql = 'update player set last_logout_time = ' + eventData['payload']['timestamp'] + ' where player_id = ' + eventData['payload']['character_id'];
    sqlConnection.query(sql, function(err, result) {
      if (err) throw err;
    })
    //console.log("Player logout");
  }
}

const loginsConnection = new WebSocket(url);

loginsConnection.onopen = () => {
  loginsConnection.send('{"service":"event","action":"subscribe","worlds":["1","10","13","17","25","40"],"eventNames":["PlayerLogin"]}');
}

loginsConnection.onerror = error => {
  console.log('WebSocket error: ${error}');
}

loginsConnection.onmessage = e => {
  var eventData = JSON.parse(e.data);
  if(eventData['payload'] != undefined) {
    console.log(eventData['payload']['character_id'] + ' has logged in');
    var sql = 'SELECT * FROM player WHERE player_id=' + eventData['payload']['character_id'];
    sqlConnection.query(sql, function(err, result) {
      if (err) throw err
        apiRequest('http://census.daybreakgames.com/s:sealith/get/ps2:v2/character/?character_id=' + eventData['payload']['character_id'], function(error, response, body) {
          var playerData = JSON.parse(body);
          if (playerData['returned'] == 1) {
            //console.log("Player logging in world_id: " + eventData['payload']['world_id']);
            var char = playerData['character_list'][0];
            if (char['times']['last_login'] == 0) {
              //console.log("New Player! " + eventData['payload']['character_id']);
              //console.log(result.length);
            }
            var lastLoginDate = (Math.floor(char['times']['last_login'] / 86400));
            var curDateNum = Math.floor(Math.floor(Date.now() / 1000) / 86400) 
            if (curDateNum != lastLoginDate) {
              sql = 'Select * from unique_daily_logins where day_num = ' + curDateNum;
              sqlConnection.query(sql, function(err, result) {
                if (result.length == 0) {
                  sqlConnection.query('insert into unique_daily_logins (day_num, number_uniques) values (' + curDateNum + ',1)', function(err, result) {});
                } else {
                  sqlConnection.query('update unique_daily_logins set number_uniques = number_uniques + 1 where day_num = ' + curDateNum + '', function(err, result) {
                    if (err) throw err;
                  });
                }
              })
            }
            
            if (result.length == 0) {
              //console.log('New player');
              var newPlayerFields = 'player_id,player_name,player_name_lower,world_id,faction_id,head_id,title_id,creation_time,last_save_time,last_login_time,current_session_login_time,login_count,minutes_played,earned_certs,gifted_certs,spent_certs,available_certs,percent_to_next_cert,battle_rank,percent_to_next_rank,profile_id,daily_ribbon_count,prestige_level,online';
              var newPlayerValues = char['character_id'] +
                  ',"' + char['name']['first'] + '"' +
                  ',"' + char['name']['first_lower']  + '"' +
                  ',"' + eventData['payload']['world_id']  + '"' +
                  ',' + char['faction_id'] +
                  ',' + char['head_id'] +
                  ',' + char['title_id'] +
                  ',' + char['times']['creation'] +
                  ',' + char['times']['last_save'] + 
                  ',' + char['times']['last_login'] +
                  ',' + Math.floor(Date.now() / 1000) +
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
                  ',' + char['prestige_level'] + 
                  ',1';
              //console.log(newPlayerValues);
              var newPlayerSql = 'INSERT INTO player (' + newPlayerFields + ') VALUES (' + newPlayerValues + ')';
              //console.log('INSERT INTO player (' + newPlayerFields + ') VALUES (' + newPlayerValues + ')');
              sqlConnection.query(newPlayerSql, function(err , result) {
                if (err) throw err
              })
              //console.log(newPlayerSql);
            } else {
              var returnPlayerSql = 'UPDATE player SET ' +
                  'world_id = ' + eventData['payload']['world_id'] + ', ' + 
                  'title_id = ' + char['title_id'] + ', ' + 
                  'last_save_time = ' + char['times']['last_save'] + ', ' +
                  'last_login_time = ' + char['times']['last_login'] + ', ' +
                  'current_session_login_time = ' + Math.floor(Date.now() / 1000) + ', ' +
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
                  'prestige_level = ' + char['prestige_level'] + ', ' +
				  'online = 1 '
                  ' WHERE player_id = ' + char['character_id'];
              //console.log(returnPlayerSql);
            }
          } else {
            //console.log(eventData['payload']['character_id']);
            //console.log(playerData);
          }
        })
      
    })
    //console.log(eventData['payload']['event_name']);
  }
}

/*
WORLD IDS
Connery = 1
Miller = 10
Cobalt = 13
Emerald = 17
Jaeger = 19
Briggs = 25
SolTech = 40
*/
setInterval(() => {
  var sql = 'select max(15min_timestamp) as recent_time from 15min_player_count';
  sqlConnection.query(sql, function(err, result) {
    if (err) throw err;
    if (Math.floor(Date.now() / 1000) - result[0].recent_time > 900) {
      
      var sql2 = 'select world_id, COUNT(*) as players from player where online = 1 group by world_id'
    sqlConnection.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      //console.log(result2);
      var Connery;
      var Miller;
      var Cobalt;
      var Emerald;
      var Briggs;
      var SolTech;
      result2.forEach(function(element) {
        switch(element.world_id) {
          case 1:
            Connery = element.players;
            break;
          case 10:
            Miller = element.players;
            break;
          case 13:
            Cobalt = element.players;
            break;
          case 17:
            Emerald = element.players;
            break;
          case 25:
            Briggs = element.players;
            break;
          case 40:
            SolTech = element.players;
            break;
        }
        //console.log(element.world_id);
      });
      var sql2 = 'insert into 15min_player_count (15min_timestamp, world_1, world_10, world_13, world_17, world_25, world_40)' +
          'values(' + Math.floor(Date.now() / 1000) +', ' + Connery + ', ' + Miller + ', ' + Cobalt + ', ' + Emerald + ', ' + Briggs + ', ' + SolTech + ')'
      //console.log(sql2);
      sqlConnection.query(sql2, function(err2, result2) {if (err) throw err})
    })
    }
  })
}, 1000)

app.get("/", (request, response) => {
  //console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});

app.listen(process.env.PORT); setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`); 
}, 2800)

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
//const listener = app.listen(process.env.PORT, function() {
  //console.log('Your app is listening on port ' + listener.address().port);
//});
