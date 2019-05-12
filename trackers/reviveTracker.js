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

function reviveEvent(id) {
	console.log("ID revive: " + id);
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from revive_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into revive_count (day_timestamp, xp_id_' + id + ',total) values (' + currentDay + ',1,1)';
		} else {
			var sql2 = 'update revive_count set xp_id_' + id + ' = xp_id_' + id + ' + 1, total = total + 1 where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

const gainExperienceConnection = new WebSocket(url);
gainExperienceConnection.onopen = () => {
	gainExperienceConnection.send('{"service":"event","action":"subscribe","characters":["all"],"eventNames":["GainExperience"]}');
}
gainExperienceConnection.onerror = error => {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
gainExperienceConnection.onmessage = e => {
	var eventData = JSON.parse(e.data);
	if (eventData['payload'] != undefined) {
		var xp_id = eventData['payload']['experience_id'];
		var sql = 'select * from xp_info where xp_id = ' + xp_id;
		sqlConnection.query(sql, function(err, result) {
			if (err) throw err;
			if (result[0] != undefined) {
			if (result[0].revive == 1)
				reviveEvent(xp_id);
			}
		})
	}
}
