/* the cia collects incoming alerts */

var events = require("events");
var url = require("url");
var dgram = require("dgram");
 
function cia(opts){
	if (!(this instanceof cia)) return new cia(opts);
	this.opts = opts;
	return this;
};
 
cia.prototype = new events.EventEmitter;

cia.prototype.listen = function(a, callback){

	var self = this;

	if (typeof a !== "string") {
		self.emit("error", new Error("invalid address"));
		return self;
	};

	try {
		var a = url.parse(a);
	} catch(e) {
		self.emit("error", new Error("invalid address"));
		return self;
	}
	
	var protocol = a.protocol.replace(/:$/,'');
	
	switch (protocol) {
		case "udp4":
		case "udp6":
			
			if (!a.hasOwnProperty("port") || typeof a.port !== "string" || isNaN(parseInt(a.port,10))) {
				self.emit("error", new Error("invalid port"));
				return self;
			}

			if (!a.hasOwnProperty("hostname") || typeof a.hostname !== "string" || a.hostname === "") {
				self.emit("error", new Error("invalid hostname"));
				return self;
			}
			
			dgram.createSocket(protocol).on("listening", function(){
				self.emit("listening", this.address());
			}).on("close", function(){
				self.emit("close", this.address());
			}).on("error", function(err){
				self.emit("error", err, a);
			}).on("message", function(message, remote){
				console.log("yay, message");
				console.log(message, remote);
				/* FIXME: do something fine here */
			}).bind(parseInt(a.port,10), a.hostname);
			
		break;
		// FIXME: add tcp and socket somewhere here
		default:
			self.emit("error", new Error("invalid protocol"));
			return self;
		break;
	}

	return self;
	
};

module.exports = cia;