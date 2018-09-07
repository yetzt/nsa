#!/usr/bin/env node

// node modules
var dgram = require("dgram");

// npm modules
var queue = require("quu");
var debug = require("debug")("client");

// udp client
function client(opts){
	if (!(this instanceof client)) return new client(opts);
	var self = this;
	self.opts = opts;
	self.queue = queue(1);
	self.connection = null;
	return self;
};

// open connectio 
client.prototype.open = function(fn){
	var self = this;
	debug("open");

	// default callback
	if (typeof fn !== "function") var fn = function(){};
	
	(function(next){
		return (self.connection === null) ? next() : self.connection.close(next);
	})(function(){

		self.connection = dgram.createSocket(self.opts.protocol);
		self.connection.unref();
		
		self.connection.on("close", function(){
			self.connection = null;
			debug("connection closed");
		});

		self.connection.on("error", function(err){
			self.connection = null;
			debug("connection error: %s", err);
		});

		self.connection.on("message", function(message, remote){
			if (typeof self.opts.receive !== "function") self.opts.receive = function(msg, rem){
				debug("message: %j %j", msg, rem);
			};
			
			try {
				var message = JSON.parse(message);
			} catch(err) {
				return debug("message error: %s", err);
			}
			
			self.opts.receive(message, remote);
		});

		self.connection.on("listening", function(){
			return fn();
		});

		// make things happen
		self.connection.bind();

	});
	
	return self;
};

// close connection
client.prototype.close = function(fn){
	var self = this;
	if (self.connection !== null) {
		debug("closing connection");
		try {
			self.connection.close(fn);
		} catch (err) {
			fn(err);
		}
	}
	return self;
}

// send message
client.prototype.send = function(message, fn){
	var self = this;
	
	if (typeof fn !== "function") var fn = function(err){
		if (err) debug("send error: %s", err);
	};
	
	self.queue.push(function(done){
		(function(next){
			return (self.connection !== null) ? next() : self.open(next);
		})(function(err){
			if (err) return fn(err), done();
		
			// send packet
			self.connection.send(message, 0, message.length, self.opts.port, self.opts.hostname, function(err, bytes) {
				debug("sent: %s - %s", message.toString(), ((!!err)?"Error: "+err:"OK"))
				return fn(err), done();
			});

		});

	});
	
	return self;
};

module.exports = client;
