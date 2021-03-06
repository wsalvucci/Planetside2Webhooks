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

setInterval(() => {
	var sql = 'select max(15min_timestamp) as recent15min from 15min_online';
	var cur15min = (Math.floor((Date.now() / 1000) / 900)) * 900;
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		var recent15min = result[0].recent15min;
		if (cur15min > recent15min) {
			var sql2 = 'select world_id,count(*) as players from player_online where online = 1 group by world_id';
			sqlConnection.query(sql2, function(err2, result2) {
				if (err2) throw err2;
				//console.log(result2);
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
					}
				});
				var sql3 = 'insert into 15min_online (15min_timestamp,world_1,world_10,world_13,world_17,world_25,world_40) values ('
				+ cur15min
				+ ',' + Connery
				+ ',' + Miller
				+ ',' + Cobalt
				+ ',' + Emerald
				+ ',' + Briggs
				+ ',' + SolTech
				+ ')';
				console.log(sql3);
				sqlConnection.query(sql3, function(err3, result3) {if (err3) throw err3})
			})
		}
	})
},1000)

const url = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:sealith';

function getCurrentDayTimestamp() {
	return (Math.floor((Date.now() / 1000) / 86400)) * 86400;
}

function characterLoggedOut(id,world_id) {
	var sql = 'select player_id from player_online where player_id = "' + id + '"';
	console.log(sql);
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		console.log(result);
		console.log(result.length);
		if (result.length != 0)
			var sql2 = 'update player_online set online = 0 where player_id = "' + id + '"';
		else
			var sql2 = 'insert into player_online (player_id,world_id,online) values("' + id + '",' + world_id + ',0)';
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2})
	})
}

function characterLoggedIn(id,world_id) {
	var sql = 'select player_id from player_online where player_id = "' + id + '"';
	console.log(sql);
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		console.log(result);
		console.log(result.length);
		if (result.length != 0)
			var sql2 = 'update player_online set online = 1 where player_id = "' + id + '"';
		else
			var sql2 = 'insert into player_online (player_id,world_id,online) values("' + id + '",' + world_id + ',1)';
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2})
	})
}

const characterLog = new WebSocket(url);
characterLog.onopen = () => {
	characterLog.send('{"service":"event","action":"subscribe","worlds":["1","10","13","17","25","40"],"eventNames":["PlayerLogin","PlayerLogout"]}');
}
characterLog.onerror = error => {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
characterLog.onmessage = e => {
	var eventData = JSON.parse(e.data);
	if (eventData['payload'] != undefined) {
		var id = eventData['payload']['character_id'];
		var world_id = eventData['payload']['world_id'];
		if (eventData['payload']['event_name'] == 'PlayerLogin')
			characterLoggedIn(id, world_id);
		else if (eventData['payload']['event_name'] == 'PlayerLogout')
			characterLoggedOut(id, world_id);
	}
}
