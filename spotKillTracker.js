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

function ramKillEvent(id) {
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from ram_kill_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into ram_kill_count (day_timestamp, xp_id_' + id + ') values (' + currentDay + ',1)';
		} else {
			var sql2 = 'update ram_kill_count set xp_id_' + id + ' = xp_id_' + id + ' + 1 where day_timestamp = ' + currentDay;
		}
		sqlConnection.query(sql2, function(err, result) {if (err) throw err});
	})
}

const gainExperienceConnection = new WebSocket(url);
gainExperienceConnection.opopen = () => {
	gainExperienceConnection.send('{"service":"event","action":"subscribe","characters":["all"],"eventNames":["GainExperience"]}');
}
gainExperienceConnection.onerror = error = {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
gainExperienceConnection.onmessage = e => {
	var eventData = JSON.parse(e.data);
	if (eventData['payload'] != undefined) {
		switch(eventData['payload']['experience_id']) {
			case 73:
			case 74:
			case 75:
			case 76:
			case 77:
			case 78:
			case 79:
			case 80:
			case 81:
			case 82:
			case 83:
			case 84:
			case 85:
			case 300:
			case 356:
			case 502:
			case 580:
			case 603:
			case 615:
			case 627:
			case 639:
			case 652:
			case 1242:
			case 1253:
			case 1260:
			case 1271:
			case 1281:
			case 1297:
			case 1308:
			case 1328:
			case 1374:
				ramKillEvent(eventData['payload']['experience_id'])
				break;
		}
	}
}
