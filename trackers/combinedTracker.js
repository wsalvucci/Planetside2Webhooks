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

//DEATH EVENTS
function recordDeathEvent(killer_id,victim_id,killer_faction_id,victim_faction_id,vehicle,headshot,teamkill) {
	var vehicleInc = vehicle ? 1 : 0;
	var headshotInc = headshot ? 1 : 0;
	var teamkillInc = teamkill && !(killer_faction_id == 4 && victim_faction_id == 4) ? 1 : 0;
	var ncKillInc = killer_faction_id == 2 ? 1 : 0;
	var trKillInc = killer_faction_id == 3 ? 1 : 0;
	var vsKillInc = killer_faction_id == 1 ? 1 : 0;
	var nsoKillInc = killer_faction_id == 4 ? 1 : 0;
	var ncDeathInc = victim_faction_id == 2 ? 1 : 0;
	var trDeathInc = victim_faction_id == 3 ? 1 : 0
	var vsDeathInc = victim_faction_id == 1 ? 1 : 0;
	var nsoDeathInc = victim_faction_id == 4 ? 1 : 0;
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from death_tracker';
	sqlConnection.query(sql, function(err, result) {
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into death_tracker (day_timestamp,deaths,headshots,teamkills,vehicle_deaths,nc_kills,tr_kills,vs_kills,nso_kills,nc_deaths,tr_deaths,vs_deaths,nso_deaths) values(' + currentDay + ',1,' + headshotInc + ',' + teamkillInc + 
			',' + vehicleInc + ',' + ncKillInc + ',' + trKillInc + ',' + vsKillInc + ',' + nsoKillInc + ',' + ncDeathInc + ',' + trDeathInc + ',' + vsDeathInc + ',' + nsoDeathInc + ')';
		} else {
			var sql2 = 'update death_tracker set ' +
			'deaths = deaths + 1' + 
			', headshots = headshots + ' + headshotInc + 
			', teamkills = teamkills + ' + teamkillInc + 
			', vehicle_deaths = vehicle_deaths + ' + vehicleInc + 
			', nc_kills = nc_kills + ' + ncKillInc + 
			', tr_kills = tr_kills + ' + trKillInc + 
			', vs_kills = vs_kills + ' + vsKillInc + 
			', nso_kills = nso_kills + ' + nsoKillInc + 
			', nc_deaths = nc_deaths + ' + ncDeathInc + 
			', tr_deaths = tr_deaths + ' + trDeathInc + 
			', vs_deaths = vs_deaths + ' + vsDeathInc + 
			', nso_deaths = nso_deaths + ' + nsoDeathInc + 
			' where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

function deathEvent(killer_id,victim_id,vehicle,headshot) {
	//console.log(killer_id + " killed " + victim_id + ". Vehicle: " + vehicle + " Headshot: " + headshot);
	var killer_faction_id = -1;
	var victim_faction_id = -2;
	var sql = 'select faction_id from player where player_id = ' + killer_id;
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (result.length > 0) {
			killer_faction_id = result[0]['faction_id'];
		} else {
			console.log(killer_id + " not found");
		}
		var sql2 = 'select faction_id from player where player_id = ' + victim_id;
		sqlConnection.query(sql2, function(err2, result2) {
			if (err2) throw err2;
			if (result2.length > 0) {
				victim_faction_id = result2[0]['faction_id'];
			} else {
				console.log(victim_id + " not found");
			}
//			console.log("A " + killer_faction_id + " killed a " + victim_faction_id);
			var teamkill = killer_faction_id == victim_faction_id ? true : false;
			recordDeathEvent(killer_id,victim_id,killer_faction_id,victim_faction_id,vehicle,headshot,teamkill);
		})
	})
}

//FACILITY EVENTS


//PLAYER LOG EVENTS
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

//RAM KILL EVENTS
function ramKillEvent(id) {
	console.log("ID spot: " + id);
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from ram_kill_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into ram_kill_count (day_timestamp, xp_id_' + id + ',total) values (' + currentDay + ',1,1)';
		} else {
			var sql2 = 'update ram_kill_count set xp_id_' + id + ' = xp_id_' + id + ' + 1, total = total + 1 where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

//REPAIR EVENTS
function repairEvent(id) {
	console.log("ID repair: " + id);
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from repair_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into repair_count (day_timestamp, xp_id_' + id + ',total) values (' + currentDay + ',1,1)';
		} else {
			var sql2 = 'update repair_count set xp_id_' + id + ' = xp_id_' + id + ' + 1, total = total + 1 where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

//RESUPPLY EVENTS
function resupplyEvent(id) {
	console.log("ID revive: " + id);
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from resupply_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into resupply_count (day_timestamp, xp_id_' + id + ',total) values (' + currentDay + ',1,1)';
		} else {
			var sql2 = 'update resupply_count set xp_id_' + id + ' = xp_id_' + id + ' + 1, total = total + 1 where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

//REVIVE EVENTS
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

//SPOT KILL EVENTS
function spotKillEvent(id) {
	console.log("ID spot: " + id);
	var currentDay = getCurrentDayTimestamp();
	var sql = 'select max(day_timestamp) as recent_day from spot_kill_count';
	sqlConnection.query(sql, function(err, result) {
		if (err) throw err;
		if (currentDay > result[0].recent_day) {
			var sql2 = 'insert into spot_kill_count (day_timestamp, xp_id_' + id + ',total) values (' + currentDay + ',1,1)';
		} else {
			var sql2 = 'update spot_kill_count set xp_id_' + id + ' = xp_id_' + id + ' + 1, total = total + 1 where day_timestamp = ' + currentDay;
		}
		console.log(sql2);
		sqlConnection.query(sql2, function(err2, result2) {if (err2) throw err2});
	})
}

//WEBHOOK CONNECTION
const websocket = new WebSocket(url);
websocket.onopen = () => {
	websocket.send('{"service":"event","action":"subscribe","characters":["all"],"eventNames":["Death"],"worlds":["1","10","13","17","25","40"],"logicalAndCharactersWithWorlds":true}');
}
websocket.onerror = error => {
  console.log('WebSocket error: ${error}' + error);
  console.log(error);
}
websocket.onmessage = e => {
	var eventData = JSON.parse(e.data);
	if (eventData['payload'] != undefined) {
		switch (eventData['payload']['event_name']) {
			case 'Death':
				var vehicle = eventData['payload']['attacker_vehicle_id'] != 0 ? true : false;
				var headshot = eventData['payload']['is_headshot'] == 1 ? true : false;
				deathEvent(eventData['payload']['attacker_character_id'],eventData['payload']['character_id'],vehicle,headshot);
				break;
			case 'PlayerLogin':
			case 'PlayerLogout':
				var id = eventData['payload']['character_id'];
				var world_id = eventData['payload']['world_id'];
				if (eventData['payload']['event_name'] == 'PlayerLogin')
					characterLoggedIn(id, world_id);
				else if (eventData['payload']['event_name'] == 'PlayerLogout')
					characterLoggedOut(id, world_id);
				break;
			case 'GainExperience':
				var xp_id = eventData['payload']['experience_id'];
				var sql = 'select * from xp_info where xp_id = ' + xp_id;
				sqlConnection.query(sql, function(err, result) {
					if (err) throw err;
					if (result[0] != undefined) {
					if (result[0].repair == 1)
						repairEvent(xp_id);
					if (result[0].resupply == 1)
						resupplyEvent(xp_id);
					if (result[0].revive == 1)
						reviveEvent(xp_id);
					if (result[0].spot_kill == 1)
						spotKillEvent(xp_id);
					}
				})
				break;
		}
		//console.log("Player killed");
		
	}
}
