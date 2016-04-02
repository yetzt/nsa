# NSA

NSA sees all, because NSA is the Networked Status Aggregator.

The idea is simple: NSA sends hartbeat messages over network sockets (currently only UDP) and the [nsa-server](https://www.npmjs.com/package/nsa-server) displays running services on a web interface (and, in the future, does other stuff with them).

NSA is as simple as possible: Clients just send heartbeats and the NSA Server displays new clients on the go. 

## NSA Client

### Install

```
npm install nsa
```

### Usage

``` javascript

var nsa = require("nsa");

var heart = new nsa({
	server: "udp4://localhost:8888", // nsa server
	service: "example",              // service name; default: filename of main module
	node: "example",                 // name of the node; default: hostname
	interval: "10s"                  // interval between heartbeats
});

/* send a single heartbeat */
heart.beat();

/* start sending heartbeats every $interval */
heart.start();

/* stop sending heartbeats */
heart.stop();

/* tell the nsa server to stop caring about this service */
heart.end();
```

## Message Format

``` javascript
var message = [
	0,                 // message format version
	0,                 // message type (0=heartbeat,1=retire,2=data)
	0,                 // sequence number of message
	"example.service", // name of the service
	"example.host",    // name of the node
	10000,             // number of microseconds till next message
	[data]             // data (optional)
];
```