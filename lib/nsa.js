#!/usr/bin/env node

// node modules
var url = require("url");
var path = require("path");
var crypto = require("crypto");

// npm modules
var dur = require("dur");
var debug = require("debug")("nsa");

// local modules
var client = require("./client.js");

// nsa
function nsa(opts, fn){
	if (!(this instanceof nsa)) return new nsa(opts, fn);
	
	var self = this;
	
	// default callback
	if (typeof fn !== "function") var fn = function(err){
		if (err) throw err;
	};
		
	self.opts = {};
	self.count = 0;
	self.version = 0;
	self.client = null;
	self.timer = null;
	
	// ensure opts is an object
	if (!opts) var opts = {};
	
	// if opts is string, take string as server
	if (typeof opts === "string") var opts = { server: opts };
		
	// check server
	if (!opts.hasOwnProperty("server") || typeof opts.server !== "string" || opts.server === "") return fn(new Error("invalid server")), self;
	
	// parse server string
	try {
		opts.server = url.parse(opts.server,true,true);
	} catch (err) {
		return fn(err), self;
	}
				
	// default port 30826 (nsa in base36)
	if (!opts.server.port) opts.server.port = 30826;
	if (typeof opts.server.port === "string") opts.server.port = parseInt(opts.server.port, 10);
	if (typeof opts.server.port !== "number" || isNaN(opts.server.port) || opts.server.port <= 0 || opts.server.port > 65535) return fn(new Error("invalid server.port")), self;
	
	// try to determine protocol
	if (!!opts.server.protocol) opts.protocol = opts.server.protocol.replace(/:(\/\/)?$/,'');
	else if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(opts.server.hostname)) opts.server.protocol = "udp4";
	else if (/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i.test(opts.server.hostname)) opts.server.protocol = "udp6";
	else return fn(new Error("invalid server.protocol")), self;

	// check server.hostname
	if (!opts.server.hasOwnProperty("hostname") || typeof opts.server.hostname !== "string" || opts.server.hostname === "") return fn(new Error("invalid server.hostname")), self;

	// poplulate service and secret from url auth
	if (!!opts.server.auth) {
		opts.server.auth = opts.server.auth.split(/:/);
		if (!opts.service) opts.service = opts.server.auth[0];
		if (!opts.secret) opts.secret = opts.server.auth[1];
		delete opts.server.auth;
	};

	// check service or set
	if (!opts.hasOwnProperty("service") || typeof opts.service !== "string" || opts.service === "") opts.service = path.basename(process.mainModule.filename, ".js");

	// check nodename or use hostname
	if (!opts.hasOwnProperty("node") || typeof opts.node !== "string" || opts.node === "") opts.node = require("os").hostname();

	// parse interval
	if (!opts.hasOwnProperty("interval")) opts.interval = 10000; // default interval: 10s
	if (typeof opts.interval === "string") opts.interval = dur(opts.interval);
	if (typeof opts.interval !== "number" || isNaN(opts.interval) || opts.interval <= 0 || opts.interval === Infinity) opts.interval = 10000;

	debug("new instance %s://%s:%d/%s@%s", opts.protocol, opts.server.hostname, opts.server.port, opts.service, opts.node);

	self.opts = opts;
		
	switch (self.opts.protocol) {
		case "udp4":
		case "udp6":

			self.client = new client({
				protocol: self.opts.protocol,
				hostname: self.opts.server.hostname,
				port: self.opts.server.port,
				receive: function(message, remote){
					self.handle(message, remote);
				},
			});
			
		break;
		default: 
			// want sockets, tcp, http, whatever? tap in here.
			return fn(new Error("invalid protocol")), self;
		break;
	}
	
	// handle interrupts on tty with closing connection and exiting gracefully 
	// if no other interrupt handlers are present
	if (process.stdout.isTTY) process.prependOnceListener("SIGINT", function(){
		debug("caught interrupt, attpemting graveful exit");
		self.end(function(){
			if (process.listenerCount("SIGINT") === 0) debug("exiting"), process.exit();
		});
	});

	return self;
	
};

// keep for compatibility
nsa.prototype.ready = function(fn){
	return fn(null), this;
};

// send heartbeat
nsa.prototype.ping = nsa.prototype.beat = function(fn){
	var self = this;
	debug("<%d> ping", self.count+1);
	return self.msg(0, fn), self;
};

// stop heartbeats and send retirement packet to server
nsa.prototype.end = nsa.prototype.release = function(fn){
	var self = this;

	// if no callback, define noop callback
	if (typeof callback !== "function") var callback = function(){};

	return self.stop(function() {
		self.retire(function() { // send retire packet
			self.client.close(function(){ // close socket
				debug("<end>");
				fn(null); 
			});
		});
	}), self;
	
};

// send data
nsa.prototype.send = nsa.prototype.data = nsa.prototype.leak = function(data, fn){
	var self = this;
	debug("<%d> data", self.count+1);
	
	// auto-detect type
	var t = (data instanceof Array || data.hasOwnProperty("id") || data.hasOwnProperty("value")) ? 5 : 2;
	
	// ensure data is an array
	if (t === 5 && !(data instanceof Array))  data = [data];
	
	return self.msg(t, data, fn), self;
};

// set level
nsa.prototype.level = nsa.prototype.defcon = nsa.prototype.alert = function(level, fn){
	var self = this;
	debug("<%d> level %d", self.count+1, level);
	return self.msg(3, level, fn), self;
};

// tell the server to forget about us
nsa.prototype.retire = function(fn){
	var self = this;
	debug("<%d> retire", self.count+1);
	return self.msg(1, fn), self;
};

// authenticate
nsa.prototype.auth = function(fn){
	var self = this;
	debug("<%d> auth", self.count+1);

	// if no callback, define noop callback
	if (typeof fn !== "function") var fn = function(){};

	// fail on no secret
	if (!self.opts.secret) return fn(new Error("no secret")), self;

	crypto.randomBytes(256, function(err, buf) {
		if (err) return fn(err);
		var salt = buf.toString("hex");
		var hash = crypto.createHash('sha256').update([salt,self.opts.node,self.opts.service,self.opts.secret,self.opts.challenge].filter(function(v){ return !!v; }).join("")).digest().toString('hex');
		return self.msg(4, [hash,salt], fn), self;
	});

	return self;
};

// start sending regular heartbeats
nsa.prototype.start = function(fn){
	var self = this;
	debug("<start>", self.count+1);

	// if no callback, define noop callback
	if (typeof fn !== "function") var fn = function(){};

	// clear timer if exists
	if (self.timer !== null) clearInterval(self.timer);
	
	// set timer for sending heartbeats
	self.timer = setInterval(function(){
		self.ping();
	}, self.opts.interval);
	
	// and send one heartbeat right now
	self.ping();

	// call back
	return fn(null), self;

};

// stop sending regular heartbeats
nsa.prototype.stop = function(fn){
	var self = this;
	debug("<stop>", self.count+1);

	// if no callback, define noop callback
	if (typeof fn !== "function") var fn = function(){};
	
	// check if timer is already cleared
	if (self.timer === null || self.timer.constructor.name !== "Timeout" || self.timer._destroyed) return fn(null), self;
	
	// clear timer
	self.timer = clearInterval(self.timer), null;
	
	// call back
	return fn(null), self;
};

// encode and send message
nsa.prototype.msg = function(type, data, fn){
	var self = this;

	// optionalize data, ensure callback
	if (typeof data === "function") var fn = data, data = null;
	if (typeof fn !== "function") var fn = function(){};

	// build packet buffer and send
	try { 
		return self.client.send(Buffer.from(JSON.stringify(
			(function(msg){
				if (true || !!data) msg.push(data);
				return msg;
			})([
				self.version,
				type,
				self.count++,
				self.opts.service,
				self.opts.node,
				self.opts.interval
			]))), fn), self;
	} catch (err){
		return fn(err), self;
	}

};

// handle incoming messages (auth requests)
nsa.prototype.handle = function(message, remote){
	var self = this;
	
	if (!(message instanceof Array)) return self;
	switch (message[1]) {
		case 6: 
			// set challenge and send auth
			self.opts.challenge = message[6];
			self.auth();
		break;
	}
	
	return self;
};

// export module
module.exports = nsa;

