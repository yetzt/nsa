/* gchq is a good configuration handling queue */

var fs = require("fs");
var path = require("path");

var merge = require("merge");

/* main module directory */
var __root = path.dirname(process.mainModule.filename);

function gchq(){
	if (!(this instanceof gchq)) return new gchq();
	this.__config = {};
	return this;
};

gchq.prototype.file = function(file) {
	
	if (typeof file !== "string") return this;
	if (file.substr(0,1) !== "/") file = path.resolve(process.cwd(), file);
	if (!fs.existsSync(file)) return this;
	
	try {
		this.__config = JSON.parse(fs.readFileSync(file));
	} catch(e) {
		return this;
	}

	return this;
	
};

gchq.prototype.set = function(key, value) {
	if (typeof value !== "undefined" && value !== null && value !== "" && value !== [] && value !== {}) this.__config[key] = value;
	return this;
};

gchq.prototype.has = function(key) {
	return this.__config.hasOwnProperty(key);
};

gchq.prototype.type = function(key) {
	if (!this.__config.hasOwnProperty(key)) return "undefined";
	if (this.__config[key] instanceof Array) return "array";
	return typeof this.__config[key];
};

gchq.prototype.get = function(key) {
	return (this.__config.hasOwnProperty(key)) ? this.__config[key] : null;
};

module.exports = gchq;