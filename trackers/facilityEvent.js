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

const characterLog = new WebSocket(url);
characterLog.onopen = () => {
	characterLog.send('{"service":"event","action":"subscribe","worlds":["1","10","13","17","25","40"],"eventNames":["FacilityControl"]}');
}
characterLog.onerror = error => {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
characterLog.onmessage = e => {
	var eventData = JSON.parse(e.data);
	if (eventData['payload'] != undefined) {
		var newId = eventData['payload']['new_faction_id'];
		var oldId = eventData['payload']['old_faction_id'];
		if (newId == oldId || oldId == 0 || newId == 0) return;
		var sql = 'select max(day_timestamp) as recent_day from facility_captures';
		sqlConnection.query(sql, function(err, result) {
			if (err) throw err;
			var currentDay = getCurrentDayTimestamp();
			var recentDay = result[0].recent_day;
			if (currentDay > recentDay) {
				var sql2 = 'insert into facility_captures (day_timestamp, ' + newId + '_captures, ' + oldId + '_losses,total_captures) values(' + currentDay + ',1,1,1)';
			} else {
				var sql2 = 'update facility_captures set ' + newId + '_captures = ' + newId + '_captures + 1, ' + oldId + '_losses = ' + oldId + '_losses + 1, total_captures = total_captures + 1 where day_timestamp = ' + currentDay;
			}
			console.log(sql2);
			sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2})
		})
	}
}
