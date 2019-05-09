const express = require('express');
const app = express();
const mysql = require('mysql');

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

var sql = 'select xp_id from xp_info where revive = 1;';
var insertSql = 'alter table revive_count ';
sqlConnection.query(sql, function (err, result) {
	if (err) throw err;
	console.log(result);
	result.forEach(function(element) {
		insertSql = insertSql + ' add column xp_id_' + element['xp_id'] + ' INT NOT NULL DEFAULT 0, '
	})
	console.log(insertSql);
})

console.log(insertSql);
