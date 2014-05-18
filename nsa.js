#!/usr/bin/env node

/* node modules */
var url = require("url");
var path = require("path");
var dgram = require("dgram");

/* npm modules */
var dur = require("dur");

function nsa(opts, callback){
	
	if (!(this instanceof nsa)) return new nsa(opts, callback);
	
	if (typeof callback !== "function") var callback = function(err){
		if (err) throw err;
	};
	
	var self = this;
	
	this.debug = false;
	this.ready = false;
	this.ended = false;
	this.queue = [];
	this.opts = {};
	this.count = 0;
	this.version = 0;
	this.timer = null;
		
	/* check debug */
	if (opts.hasOwnProperty("debug") && opts.debug === true) this.debug = true;

	/* check server */
	if (!opts.hasOwnProperty("server") || typeof opts.server !== "string" || opts.server === "") {
		callback.call(this, new Error("invalid server"));
		return this;
	}
	
	try {
		this.opts.server = url.parse(opts.server);
	} catch (e) {
		callback(e);
		return this;
	}
		
	/* check service or set */
	if (!opts.hasOwnProperty("service") || typeof opts.service !== "string" || opts.service === "") {
		this.opts.service = path.basename(process.mainModule.filename, ".js");
	} else {
		this.opts.service = opts.service;
	}

	/* check nodename or set */
	if (!opts.hasOwnProperty("node") || typeof opts.node !== "string" || opts.node === "") {
		this.opts.node = require("os").hostname();
	} else {
		this.opts.node = opts.node;
	}

	/* check interval */
	if (!opts.hasOwnProperty("interval")) {	
		callback.call(this, new Error("invalid interval"));
		return this;
	} 

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
			
			/* check server.port */
			if (!this.opts.server.hasOwnProperty("port") || typeof this.opts.server.port !== "string" || this.opts.server.port === "") {
				callback.call(this, new Error("invalid server.port"));
				return this;
			}
			this.opts.server.port = parseInt(this.opts.server.port, 10);
			if (isNaN(this.opts.server.port) || this.opts.server.port <= 0 || this.opts.server.port > 65535) {
				callback.call(this, new Error("invalid server.port"));
				return this;
			}

			/* check server.hostname */
			if (!this.opts.server.hasOwnProperty("hostname") || typeof this.opts.server.hostname !== "string" || this.opts.server.hostname === "") {
				callback.call(this, new Error("invalid server.hostname"));
				return this;
			}
			
			this._client = dgram.createSocket(this.opts.protocol);

			this._client.on("listening", function(){
				if (self.debug) console.log("listening");
			});

			this._client.on("close", function(){
				if (self.debug) console.log("close");
			});

			this._client.on("error", function(err){
				if (self.debug) console.log("error", err);
			});

			this._send = function(type, data, callback) {

				/* when no data shift callback */
				if (typeof data === "function") {
					var callback = data;
					var data = null;
				};
				
				/* when no callback, define error-throwing callback */
				if (typeof callback !== "function") var callback = function(err) { if (err) throw err; };

				/* error when not ready */
				if (!this.ready) {
					callback.call(this, new Error("not ready"));
					return this;
				};
				
				if (this.ended) {
					callback.call(this, new Error("ended"));
					return this;
				};

				/* try to build packet */
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
				
				if (this.debug) console.log("send", message.toString());
				
				/* try sending packet */
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

				/* when no callback, define error-throwing callback */
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

/* check ready state or register callback for when ready */
nsa.prototype.ready = function(callback){
	if (typeof callback !== "function") return this.ready;
	if (this.ready) {
		callback.call(this);
		return this;
	}
	this.queue.push(callback);
	return this;
};

/* send heartbeat */
nsa.prototype.beat = function(callback){
	this._send.call(this, 0, callback);
};

/* stop heartbeats and send retirement packet to server */
nsa.prototype.end = function(callback){
	this.stop(function(){
		this._send.call(this, 1, function(){
			this._end.call(this, function(){
				callback.call(this);
			});
		});
	});
};

/* send data */
nsa.prototype.leak = function(data, callback){
	this._send.call(this, 2, data, callback);
};

/* start sending regular heartbeats */
nsa.prototype.start = function(callback){

	/* if no callback, define noop callback */
	if (typeof callback !== "function") var callback = function(){};

	/* if not ready, queue this */
	if (!this.ready) {
		console.log("waiting");
		this.queue.push(function(){
			console.log("now!");
			this.start();
		});
		return this;
	};
	
	/* do nothing if timer is already set */
	if (this.timer !== null) {
		callback.call(this, new Error("already running"));
		return this;
	}
	
	/* set timer for sending heartbeats */
	var self = this;
	this.timer = setInterval(function(){
		self.beat.call(self);
	}, this.opts.interval);
	
	/* and send one heartbeat right now */
	this.beat.call(this);

	/* call back */
	callback.call(this, null);
	return this;

};

/* stop sending regular heartbeats */
nsa.prototype.stop = function(callback){

	/* if no callback, define noop callback */
	if (typeof callback !== "function") var callback = function(){};

	/* if not ready, queue this */
	if (!this.ready) {
		this.queue.push(function(){
			this.stop();
		});
		return this;
	};
	
	/* check if timer is already cleared */
	if (this.timer === null) {
		callback.call(this, new Error("not running"));
		return this;
	}
	
	/* end timer */
	clearInterval(this.timer);
	this.timer = null;
	
	/* call back */
	callback.call(this, null);
	return this;
};

/* export module */
module.exports = nsa;