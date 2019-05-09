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

const url = 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:sealith';

function getCurrentDayTimestamp() {
	return (Math.floor((Date.now() / 1000) / 86400)) * 86400;
}

function isPlayerLogged(id) {
	var sql = 'select player_id from player_online where player_id = "' + id + '"';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (result.length == 0)
			return false;
		else
			return true;
	})
}

function characterLoggedOut(id,world_id) {
	if (isPlayerLogged(id)) {
		var sql = 'update player_online set online = 0 where player_id = "' + id + '"';
	} else {
		var sql = 'insert into player_online (player_id,world_id,online) values("' + id + '",' + world_id + ',0)';
	}
	console.log(sql);
	sqlConnection.query(sql, function(err, result) {if (err) throw err})
}

function characterLoggedIn(id,world_id) {
	if (isPlayerLogged(id)) {
		var sql = 'update player_online set online = 1 where player_id = "' + id + '"';
	} else {
		var sql = 'insert into player_online (player_id,world_id,online) values("' + id + '",' + world_id + ',1)';
	}
	console.log(sql);
	sqlConnection.query(sql, function(err, result) {if (err) throw err});
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
