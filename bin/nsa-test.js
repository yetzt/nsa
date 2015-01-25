#!/usr/bin/env node

var path = require('path');
var NSA = require(path.resolve(__dirname, '../nsa.js'));

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
	var nsaConfig = {
		server: 'udp4:127.0.0.1:46002',
		service: instance.service,
		node: instance.node,
		interval: '3s'
	};

	var nsa = new NSA(nsaConfig).start(function() {
		console.log('node '+index+' started');

		var n = 0;
		var active = true;
		var alive = true;
		setInterval(function () {
			if (!active) return;
			if (!alive) return;
			n++;
			nsa.leak({a:n})
		}, randomTime(10, 40));

		setInterval(function () {
			if (!active) return;
			if (!alive) return;
			active = false;
			nsa.end(function () {
				setTimeout(function () {
					nsa = new NSA(nsaConfig);
					nsa.start(function () {
						active = true
					});
				}, randomTime(10, 40));
			})
		}, randomTime(10, 40));

		setInterval(function () {
			if (!active) return;
			if (!alive) return;
			alive = false;
			nsa.stop(function () {
				setTimeout(function () {
					nsa.start(function () {
						alive = true
					});
				}, randomTime(10, 40));
			})
		}, randomTime(10, 40));
	});
	hearts.push(nsa);
});

process.on('SIGINT', function(){
	console.log('stopping...')
	hearts.forEach(function(h){
		h.end();
	});
	hearts = false;
	setTimeout(function(){
		process.exit();
	},3000);
});

function randomTime(from, to) {
	return 1000*(from + (to-from)*Math.random());
}