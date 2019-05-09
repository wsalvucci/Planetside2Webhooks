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
	var sql = 'select player_id from player_online where player_id = "' + id '"';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		console.log(result.length);
	})
}

function characterLoggedOut(id) {
	
}

function characterLoggedIn(id) {
	
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
		if (eventData['payload']['event_name'] == 'PlayerLogin')
			characterLoggedIn(id);
		else if (eventData['payload']['event_name'] == 'PlayerLogout')
			characterLoggedOut(id);
	}
}
