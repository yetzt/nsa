# NSA

nsa sees all, because nsa is the networked status aggregator.

![nsa successful in europe](assets/images/nsa-promo.jpg)

the idea is simple: nsa receives hartbeats over network sockets (currently only udp) and displays running services on a web interface (and, in the future, does other stuff with them).

nsa is as simple as possible: clients just send heartbeats and nsa displays new clients on the go. other than deciding on where to listen, no further configuration is required. maybe some sort of simple authentication will be implemented, but for now it's all just working out of the box.  

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

See also [config.js.dist](config.js.dist);

## Client

### Install

````
npm install nsa
````

### Usage

```` javascript

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