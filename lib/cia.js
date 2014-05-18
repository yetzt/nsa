/* the cia collects incoming alerts */

var crypto = require("crypto");
var events = require("events");
var dgram = require("dgram");
var url = require("url");
 
function cia(opts){
	if (!(this instanceof cia)) return new cia(opts);
	this.opts = opts;
	this.nodes = {};
	this.timers = {};
	this.on("message", function(message){
		this.handle(message);
	});
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

				try {
					var message = JSON.parse(message);
				} catch(err) {
					return self.emit("error", err);
				}
				
				self.parse(message, remote, function(err, message){
					if (err) return self.emit("error", err);
					self.emit("message", message);
				});

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

cia.prototype.id = function(str){
	return crypto.createHash('sha256').update(str).digest('hex');
};

cia.prototype.parse = function(message, remote, callback) {

	var validate = function(message){
		
		if (isNaN(message.sequence) || message.sequence < 0) return callback(new Error("invalid message sequence"));
		if (typeof message.service !== "string" || message.service === "") return callback(new Error("invalid message service"));
		if (typeof message.node !== "string" || message.node === "") return callback(new Error("invalid message node"));
				
		if (message.service.length > 512) message.service = message.service.substr(0,512);
		if (message.node.length > 512) message.node = message.node.substr(0,512);
		
		callback(null, message);
		
	};

	/* switch on message format version */
	switch (message[0]) {
		case 0:
			/* switch on message type */
			switch (message[1]) {
				case 0: /* heartbeat */
					validate({
						"type": "heartbeat",
						"sequence": parseInt(message[2],10),
						"service": message[3].toString(),
						"node": message[4].toString(),
						"interval": parseInt(message[5],10),
						"remote": remote.address
					});
					return this;
				break;
				case 1: /* retire */
					validate({
						"type": "retire",
						"sequence": parseInt(message[2],10),
						"service": message[3].toString(),
						"node": message[4].toString(),
						"interval": parseInt(message[5],10),
						"remote": remote.address
					});
					return this;
				break;
				case 2: /* data */
					validate({
						"type": "data",
						"sequence": parseInt(message[2],10),
						"service": message[3].toString(),
						"node": message[4].toString(),
						"interval": parseInt(message[5],10),
						"data": message[6],
						"remote": remote.address
					});
					return this;
				break;
				default:
					callback(new Error("unknown message type"));
					return this;
				break;
			}
		break;
		default:
			callback(new Error("unknown message format version"));
			return this;
		break;
	}
	
};

cia.prototype.handle = function(message) {
	var self = this;
	
	message.id = this.id([message.service, message.node].join("@"))
	if (!this.nodes.hasOwnProperty(message.id)){

		/* register node data */
		this.nodes[message.id] = {
			"id": message.id,
			"node": message.node,
			"service": message.service,
			"created": (new Date()).getTime(),
			"updated": (new Date()).getTime(),
			"lastreset": (new Date()).getTime(),
			"uptime": 0,
			"lastbeat": 0,
			"age": 0,
			"count": 0,
			"interval": message.interval,
			"sequence": message.sequence,
			"active": true,
		};
		
		/* register node timer */
		this.timers[message.id] = setInterval(function(){

			if (!self.nodes.hasOwnProperty(message.id)) return;
			
			self.nodes[message.id].lastbeat = ((new Date()).getTime() - self.nodes[message.id].updated);
			self.nodes[message.id].age = ((new Date()).getTime() - self.nodes[message.id].created);
			
			if (self.nodes[message.id].active && self.nodes[message.id].lastbeat > (self.nodes[message.id].interval * 3)) { // FIXME: make this adjustable?
				self.nodes[message.id].active = false;
				self.nodes[message.id].uptime = false;
				self.emit("node+inactive", message.id);
			} else {
				self.nodes[message.id].uptime = ((new Date()).getTime() - self.nodes[message.id].lastreset);
			}
			
			self.emit("node+info", self.nodes[message.id]);
			
		}, ((message.interval >= 2000) ? Math.floor(message.interval/2) : 1000));
		
		this.emit("node+register", message.id);

	}
	
	this.nodes[message.id].count++;
	this.nodes[message.id].updated = (new Date()).getTime();

	/* reactivate node if inactive */
	if (this.nodes[message.id].active === false) {
		this.nodes[message.id].active = true;
		self.emit("node+active", message.id);
	}
	
	/* check if sequence dropped */
	if (message.sequence < this.nodes[message.id].sequence) {
		this.nodes[message.id].lastreset = (new Date()).getTime();
		self.emit("node+reset", message.id);
	};
	
	this.nodes[message.id].sequence = message.sequence;
	
	/* check for retire message */
	if (message.type === "retire") {
		clearInterval(this.timers[message.id]);
		delete this.timers[message.id];
		delete this.nodes[message.id];
		self.emit("node+retire", message.id);
	};
	
}

cia.prototype.getnodes = function(callback) {
	var nodes = [];
	for (id in this.nodes) if (this.nodes.hasOwnProperty(id)) nodes.push(this.nodes[id]);
	nodes.sort(function(a,b){ return (a.created-b.created); });
	callback(nodes);
	return this;
};

cia.prototype.getnode = function(id, callback) {
	if (!this.nodes.hasOwnProperty(id)) {
		callback(new Error("no such node"));
		return this;
	}
	callback(null, this.nodes[id]);
	return this;
};

module.exports = cia;