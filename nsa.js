#!/usr/bin/env node

// node modules
var url = require("url");
var path = require("path");
var dgram = require("dgram");

// npm modules
var dur = require("dur");
var debug = require("debug")("nsa");

function nsa(opts, callback){
	
	if (!(this instanceof nsa)) return new nsa(opts, callback);
	
	if (typeof callback !== "function") var callback = function(err){
		if (err) throw err;
	};
	
	var self = this;
	
	this.ready = false;
	this.ended = false;
	this.queue = [];
	this.opts = {};
	this.count = 0;
	this.version = 0;
	this.timer = null;
		
	// check server
	if (!opts.hasOwnProperty("server") || typeof opts.server !== "string" || opts.server === "") {
		callback.call(this, new Error("invalid server"));
		return this;
	}
	
	try {
		this.opts.server = url.parse(opts.server);
	} catch (e) {
		callback.call(this, e);
		return this;
	}
		
	// check service or set
	if (!opts.hasOwnProperty("service") || typeof opts.service !== "string" || opts.service === "") {
		this.opts.service = path.basename(process.mainModule.filename, ".js");
	} else {
		this.opts.service = opts.service;
	}

	// check nodename or set
	if (!opts.hasOwnProperty("node") || typeof opts.node !== "string" || opts.node === "") {
		this.opts.node = require("os").hostname();
	} else {
		this.opts.node = opts.node;
	}

	// parse interval
	if (!opts.hasOwnProperty("interval")) opts.interval = "10s"; // default interval
	if (typeof opts.interval === "string") opts.interval = dur(opts.interval);
	if (typeof opts.interval !== "number" || isNaN(opts.interval) || opts.interval <= 0 || opts.interval === Infinity) {
		callback.call(this, new Error("invalid interval"));
		return this;
	}
	
	this.opts.interval = opts.interval;
	
	this.opts.protocol = this.opts.server.protocol.replace(/:$/,'');
	
	switch (this.opts.protocol) {
		case "udp4":
		case "udp6":
			
			// check server.port
			if (!this.opts.server.hasOwnProperty("port") || typeof this.opts.server.port !== "string" || this.opts.server.port === "") {
				callback.call(this, new Error("invalid server.port"));
				return this;
			}
			this.opts.server.port = parseInt(this.opts.server.port, 10);
			if (isNaN(this.opts.server.port) || this.opts.server.port <= 0 || this.opts.server.port > 65535) {
				callback.call(this, new Error("invalid server.port"));
				return this;
			}

			// check server.hostname
			if (!this.opts.server.hasOwnProperty("hostname") || typeof this.opts.server.hostname !== "string" || this.opts.server.hostname === "") {
				callback.call(this, new Error("invalid server.hostname"));
				return this;
			}
			
			this._client = dgram.createSocket(this.opts.protocol);

			this._client.on("listening", function(){
				debug("listening");
			});

			this._client.on("close", function(){
				debug("close");
			});

			this._client.on("error", function(err){
				debug("error", err);
			});

			this._send = function(type, data, callback) {

				// when no data shift callback
				if (typeof data === "function") {
					var callback = data;
					var data = null;
				};
				
				// when no callback, define error-throwing callback
				if (typeof callback !== "function") var callback = function(err) { if (err) return console.error(err, err.stack); };

				// error when not ready
				if (!this.ready) {
					callback.call(this, new Error("not ready"));
					return this;
				};
				
				if (this.ended) {
					callback.call(this, new Error("ended"));
					return this;
				};

				// try to build packet
				try {
					if (data) {
						var message = new Buffer(JSON.stringify([this.version,type,this.count++,this.opts.service,this.opts.node,this.opts.interval,data]));
					} else {
						var message = new Buffer(JSON.stringify([this.version,type,this.count++,this.opts.service,this.opts.node,this.opts.interval]));
					}
				} catch (err){
					callback.call(this, err);
					return this;
				}
				
				debug("sending %s", message.toString());
				
				// try sending packet
				this._client.send(message, 0, message.length, this.opts.server.port, this.opts.server.hostname, function(err, bytes) {
					if (err) {
						callback.call(self, err);
						return self;
					}
					callback.call(self, null);
					return self;
				});
				
			};
			
			this._end = function(callback){

				// when no callback, define error-throwing callback
				if (typeof callback !== "function") var callback = function(err) { if (err) throw err; };
				
				if (this.ended) {
					callback.call(this, new Error("already ended"));
					return this;
				};
				
				this.ended = true;
				this._client.close()
				
				callback.call(this, null);
				
			};
			
			self.ready = true;
			
		break;
		// want sockets, tcp, http, whatever? tap in here.
		default: 
			callback.call(this, new Error("invalid protocol"));
			return this;
		break;
	}
	
	if (this.ready && this.queue.length > 0) do {
		this.queue.pop().call(this);
	} while (this.queue.length > 0);
		
	return this;
	
}

// check ready state or register callback for when ready
nsa.prototype.ready = function(callback){
	var self = this;
	if (typeof callback !== "function") return self.ready;
	if (self.ready) {
		callback.call(self,null,self);
		return self;
	}
	self.queue.push(callback);
	return this;
};

// send heartbeat
nsa.prototype.beat = function(callback){
	var self = this;
	self._send.call(self, 0, callback);
	return this;
};

// stop heartbeats and send retirement packet to server
nsa.prototype.end = function(callback){
	var self = this;

	// if no callback, define noop callback
	if (typeof callback !== "function") var callback = function(){};

	self.stop(function(){
		self._send.call(self, 1, function(){
			self._end.call(self, function(){
				callback.call(self);
			});
		});
	});
	
	return this;
};

// send data
nsa.prototype.leak = nsa.prototype.send = function(data, callback){
	var self = this;
	self._send.call(self, 2, data, callback);
	return this;
};

// set defcon
nsa.prototype.defcon = function(level, callback){
	var self = this;
	self._send.call(self, 3, level, callback);
	return this;
};

// start sending regular heartbeats
nsa.prototype.start = function(callback){
	var self = this;

	// if no callback, define noop callback
	if (typeof callback !== "function") var callback = function(){};

	// if not ready, queue this
	if (!self.ready) {
		debug("waiting for ready state");
		self.queue.push(function(){
			debug("ready");
			self.start();
		});
		return self;
	};
	debug("ready");
	
	// do nothing if timer is already set
	if (self.timer !== null) {
		callback.call(self, new Error("already running"));
		return self;
	}
	
	// set timer for sending heartbeats
	self.timer = setInterval(function(){
		self.beat.call(self);
	}, self.opts.interval);
	
	// and send one heartbeat right now
	self.beat.call(self);

	// call back
	callback.call(self, null);
	return this;

};

// stop sending regular heartbeats
nsa.prototype.stop = function(callback){
	var self = this;

	// if no callback, define noop callback
	if (typeof callback !== "function") var callback = function(){};

	// if not ready, queue this
	if (!self.ready) {
    debug("waitung for ready state");
		self.queue.push(function(){
			self.stop();
		});
		return self;
	};

  debug("stopping");
	
	// check if timer is already cleared
	if (self.timer === null) {
		callback.call(self, new Error("not running"));
		return self;
	}
	
	// end timer
	clearInterval(self.timer);
	self.timer = null;
	
	// call back
	callback.call(self, null);

	return this;
};

// export module
module.exports = nsa;