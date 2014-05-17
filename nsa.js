#!/usr/bin/env node

/* node modules */
var fs = require("fs");
var url = require("url");
var path = require("path");
var querystring = require("querystring");

/* npm modules */
var express = require("express");
var commander = require("commander");

/* local modules */
var cia = require("./lib/cia");
var gchq = require("./lib/gchq");

/* load package.json */
var pkg = require(path.resolve(__dirname, "package.json"));

/* parse arguments */
commander
	.version(pkg.version)
	.option("-c, --config [config.js]", "config file")
	.option("-w, --web [url]", "web interface url")
	.option("-l, --listen [url]", "listen url", function(value,store){ store.push(value); }, [])
	.option("-v, --verbose", "say it loud", function(val, store){ store++; }, 0)
	.parse(process.argv);

/* load config */
var config = gchq()
	.file(path.resolve("config.js", __dirname))
	.file(commander.config)
	.set("web", commander.web)
	.set("listen", commander.listen)
	.set("info", (commander.verbose >= 1))
	.set("debug", (commander.verbose >= 2));
	
/* check if listeners are configured */
if (!config.get("listen")) {
	console.error("no listeners defined");
	process.exit(7);
}

/* convert single listener config to array */
if (config.type("listen") !== "array") config.set("listen", [config.get("listen")]);

/* initialize listeners */
var listener = cia().on("error", function(err){
	console.log("cia error", err);
}).on("listening", function(addr){
	console.log("cia listening", addr);
}).on("close", function(addr){
	console.log("cia closed", addr);
});

config.get("listen").forEach(function(l){
	listener.listen(l);
});

/* initialize express */
var app = express();

app.get("/", function(req, res){
	res.send("hello.")
	// FIXME: keep on hacking here
});

/* listen according to config and stuff */
(function(){

	if (!config.has("web") || config.type("web") !== "string") {
		console.error("could not start app");
		process.exit(2);
	}
	
	var listen = url.parse(config.get("web"));
	
	switch (listen.protocol) {
		case "unix:": 
			/* unlink old socket if present */
			if (typeof listen.pathname !== "string" || listen.pathname === "") {
				console.error("specified socket path is invalid");
				process.exit(3);
			}
			
			/* check if socket path is relative */
			if (listen.hostname.substr(0,1) === ".") listen.pathname = path.resolve(__dirname, listen.hostname, listen.pathname)

			/* add .sock to socket if not present */
			if (!/\.sock(et)?$/.test(listen.pathname)) listen.pathname += ".sock";

			if (fs.existsSync(listen.pathname) && !fs.unlinkSync(listen.pathname)) {
				console.error("previous socket could not be unlinked");
				process.exit(4);
			}
			
			app.listen(listen.pathname, function(){
				if (config.get("info")) console.log("listening on socket", listen.pathname);

				/* check options */
				if (listen.query) {
					var query = querystring.parse(listen.query);

					/* change mode of socket if requested */
					if (query.hasOwnProperty("mode")) {
						var mode = parseInt(query.mode, 8);
						if (!isNaN(mode) && mode <= 0777) {
							fs.chmod(listen.pathname, mode, function(err){
								if (err) return console.error("could not chmod", mode.toString(8), "socket", listen.pathname);
								if (config.get("info")) console.log("change mode", mode.toString(8), listen.pathname);
							});
						}
					}
				}
				
			});
			
		break;
		case "https:":
			console.error("https is not supportet yet.");
			process.exit(5);
		break;
		case "http:":
			if (listen.hasOwnProperty("hostname") && typeof listen.hostname === "string" && listen.hostname !== "") {
				/* listen on hostname and port */
				app.listen((listen.port || 46001), listen.hostname, function(err){
					if (config.get("info")) console.log("listening on http://", listen.hostname, ":", (listen.port || 46001));
				});
			} else {
				app.listen((listen.port || 46001), function(err){
					if (config.get("info")) console.log("listening on http://*:", (listen.port || 46001));
				});
			}
		break;
		default: 
			console.error("hostname and port or socket for web interface not specified");
			process.exit(6)
		break;
	}
})();

