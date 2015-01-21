#!/usr/bin/env node

var path = require("path");
var nsa = require(path.resolve(__dirname, "../nsa.js"));

var hearts = [];

var instances = [
	{service:'lovemeter', node:'hydra.opendatacity.de'},
	{service:'lobbyradar', node:'nyx.datenfreunde.net'},
	{service:'lettycalypse', node:'hydra.opendatacity.de'},
	{service:'blablaπ', node:'nyx.datenfreunde.net'},
	{service:'datenblumen', node:'nyx.datenfreunde.net'},
	{service:'renderit', node:'styx.opendatacity.de'},
	{service:'cccountdown', node:'hydra.opendatacity.de'},
	{service:'smarties', node:'kiesinger.okfn.de'},
	{service:'tilethief', node:'kiesinger.okfn.de'},
	{service:'zugsonar', node:'styx.opendatacity.de'},
	{service:'lobbymail', node:'nyx.datenfreunde.net'},
	{service:'flightradar', node:'nyx.datenfreunde.net'},
	{service:'tilecop', node:'nyx.datenfreunde.net'},
	{service:'tilethief', node:'nyx.datenfreunde.net'},
	{service:'tileit', node:'styx.opendatacity.de'},
	{service:'tilecop', node:'styx.opendatacity.de'},
	{service:'ships', node:'styx.opendatacity.de'},
	{service:'tilethief', node:'styx.opendatacity.de'},
	{service:'tilethief', node:'mcp.netzguerilla.net'},
	{service:'tilethief', node:'jam.netzguerilla.net'}
]

instances.forEach(function (instance, index) {
	hearts.push(new nsa({
		server: "udp4:127.0.0.1:46002",
		service: instance.service,
		node: instance.node,
		interval: "10s"
	}).start(function() {
		console.log("node "+index+" started");
	}));
});

process.on("SIGINT", function(){
	console.log("stopping...")
	hearts.forEach(function(h){
		h.end();
	});
	setTimeout(function(){
		process.exit();
	},5000);
});