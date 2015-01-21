#!/usr/bin/env node

var path = require("path");
var nsa = require(path.resolve(__dirname, "../nsa.js"));

var hearts = [];

for (var i = 0; i < 23; i++) {
	(function(i){
		hearts.push(new nsa({
			server: "udp4:127.0.0.1:46002",
			service: "nsatest",
			node: "node"+i,
			interval: "10s"
		}).start(function(){
			console.log("node "+i+" started");
		}));
	})(i);
};

process.on("SIGINT", function(){
	console.log("stopping...")
	hearts.forEach(function(h){
		h.end();
	});
	setTimeout(function(){
		process.exit();
	},5000);
});