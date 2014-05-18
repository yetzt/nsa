
$(document).ready(function(){

	var socket = io.connect('/');
	socket.on('nodes', function(nodes) {
		nodes.forEach(function(node){
			handle_node(node);
		});
	});
	
	socket.on('info', function(node){
		handle_node(node);
	});

	socket.on('inactive', function(id){
		$('#node-'+id).removeClass("active").addClass("inactive").addClass("go-inactive");
		// setTimeout(function(){ $('#node-'+id).removeClass("go-inactive"); },1000)
	});

	socket.on('active', function(id){
		$('#node-'+id).removeClass("inactive").addClass("active").addClass("go-active");
		// setTimeout(function(){ $('#node-'+id).removeClass("go-active"); },500)
	});

	socket.on('reset', function(id){
		$('#node-'+id).addClass("blink");
		setTimeout(function(){ $('#node-'+id).removeClass("blink"); },500)
	});

	socket.on('remove', function(id){
		$('#node-'+id).fadeOut(function(){
			$(this).remove();
		});
	});
	
});

var _template = '<div id="node-{{id}}" class="col-xs-12 col-sm-6 col-md-4 col-lg-3 {{#active}}active{{/active}}{{^active}}inactive{{/active}}"><div class="grid-item clearfix"><h1 class="clearfix"><span class="service">{{service}}</span><span class="node">{{node}}</span></h1><ul class="content"><li class="count"><span>signals</span> <strong>{{count}}</strong></li><li class="age"><span>known</span> <strong>{{age}}</strong></li><li class="updated"><span>last signal</span> <strong>{{updated}}</strong></li><li class="uptime"><span>uptime</span> <strong>{{uptime}}</strong></li></ul></div></div>';

var handle_node = function(node){

	var $node = $(Mustache.render(_template, {
		id: node.id,
		active: node.active,
		service: node.service,
		node: node.node,
		count: node.count,
		uptime: moment(node.lastreset).fromNow(true),
		age: moment(node.created).fromNow(true),
		updated: moment().diff(node.updated, 'seconds', true).toFixed(1)+"s"
	}));

	if ($('#node-'+node.id).length > 0) {
		$('#node-'+node.id).replaceWith($node);
	} else {
		$node.hide();
		$("#grid").prepend($node.fadeIn());
	}

}

if (!Array.prototype.forEach){
	Array.prototype.forEach = function(fun /*, thisArg */){
		"use strict";
		if (this === void 0 || this === null) throw new TypeError();
		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function") throw new TypeError();
		var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
		for (var i = 0; i < len; i++) {
			if (i in t) fun.call(thisArg, t[i], i, t);
		};
	};
};

