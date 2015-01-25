#!/usr/bin/env node

var path = require('path');
var NSA = require(path.resolve(__dirname, '../nsa.js'));

var hearts = [];

var instances = [
	{service:'whatever', node:'blog.fefe.gov'},
	{service:'thingie', node:'dev.nsa.gov'},
	{service:'this', node:'localhost'},
	{service:'π', node:'server3.14159.nsa.gov'},
	{service:'undefined', node:'undefined'},
	{service:'hello server', node:'localhost'},
	{service:'blafasel', node:'localhost'},
	{service:'another service', node:'gchq.gov.uk'},
	{service:'wait, what?', node:'server666.nsa.gov'},
	{service:'hello world', node:'localhost'},
	{service:'syntax error', node:'server2.nsa.gov'},
	{service:'zackbumm', node:'server1.nsa.gov'},
	{service:'next big thing', node:'research.nsa.gov'},
	{service:'index.js', node:'localhost'},
	{service:'look away', node:'unknown.nsa.gov'},
	{service:'secret script', node:'unknown.nsa.gov'},
	{service:'skynet', node:'server7.nsa.gov'},
	{service:'botnet', node:'server0.nsa.gov'},
	{service:'my inbox', node:'server1.nsa.gov'},
	{service:'botnet', node:'server1.nsa.gov'},
	{service:'botnet', node:'server2.nsa.gov'},
	{service:'botnet', node:'server3.nsa.gov'}
];

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