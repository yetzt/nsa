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

var agency = new nsa({
	server: "udp6://[::1]:30826", // nsa server
	service: "example",           // service name; default: filename of main module
	node: "example",              // name of the node; default: hostname
	interval: "10s",              // interval between heartbeats
	secret: "verysecurestring"    // secret shared with nsa-server
});

/* send a single heartbeat */
agency.ping();

/* start sending heartbeats every $interval */
agency.start();

// stop sending heartbeats
agency.stop();

// tell the nsa server to stop caring about this service
agency.end();

// send data
agency.data({data:"json"});

// send structured data
agency.data([{
	id: "1",         // id for data set (required)
	value: 1,        // value or values (required)
	label: "foo",    // display label (optinal)
	vis: "bar",      // visualisation (optional): text, bar, chart, ring, icon, badge
	color: "#f00",   // color (depending on visualisation)
	unit: "%",       // unit (depending on visualisation)
	range: [0,100],  // value range (depending on visualisation)
	collect: 100,    // number of previous values to collect (depending on visualisation)
},{
	...
}]);

// set alert level
agency.alert(0);
```

## Message Format

``` javascript
var message = [
	0,                 // message format version
	0,                 // message type (0=heartbeat,1=retire,2=data,3=alert, ...)
	0,                 // sequence number of message
	"example.service", // name of the service
	"example.host",    // name of the node
	10000,             // number of microseconds till next message
	[data]             // data (optional)
];
```

### Message Types

* `0` - Heartbeat Ping
* `1` - Retire
* `2` - Unstructured Data (Data Object in Data Field)
* `3` - Alert (Level 0-5 in Data Field)
* `4` - Authenticate ([hash,salt]) in Data Field
* `5` - Structured Data (Array of Data Objects in Data Field)
* `6` - Authentication Requst (Sent by Server, Challenge in Data Field)

