# NSA

nsa sees all, because nsa is the networked status aggregator.

## Server

### Install

````
npm install -g nsa
````
### Options

* `--config ./config.js` Load Config File from `$CWD/config.js`
* `--web http://localhost:9999/` HTTP Web Interface on `localhost` port `9999`
* `--web unix:/tmp/nsa.sock?mode=0760` Web Interface socket `/tmp/nsa.sock` with mode `0760`
* `--listen udp4://localhost:8888` Listen for Messages on `localhost` port `8888` with IPv4
* `--listen udp6://localhost:8888` Listen for Messages on `localhost` port `8888` with IPv6

You can use `--listen` more than once.

## Client

### Install

````
npm install nsa
````

### Usage

```` javascript

var nsa = require("nsa");

var heart = new nsa({
	server: "udp4://localhost:8888",
	service: "example",
	node: "example",
	interval: "10s"
});

/* send a single heartbeat */
heart.beat();

/* start sending heartbeats every $interval */
heart.start();

/* stop sending heartbeats */
heart.stop();

````

## Message Format

```` javascript
var message = [
	0,			// message format version
	0,			// message type (0=heartbeat,1=retire)
	0,			// sequence number of message
	"example",	// name of the service
	"example",	// name of the node
	10000		// number of microseconds till next message
];
````