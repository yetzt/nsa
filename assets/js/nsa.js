
$(document).ready(function(){

	var $grid = $("#grid");

	var socket = io.connect('/');
	socket.on('nodes', function(nodes) {
		nodes.forEach(function(node){
			_handle(node);
		});
	});
	
	socket.on('info', function(node){
		_handle(node);
	});

	socket.on('inactive', function(id){
		$('#node-'+id).removeClass("active").addClass("inactive");
	});

	socket.on('active', function(id){
		$('#node-'+id).removeClass("inactive").addClass("active");
	});

	socket.on('reset', function(id){
		$('#node-'+id).addClass("blink");
	});

	socket.on('remove', function(id){
		$grid.masonry("remove", $('#node-'+id)).masonry();
	});
	
	$('#grid').masonry({
	  columnWidth: 300,
	  itemSelector: '.item'
	});
	_redraw();
	
});

$(window).resize(function(){
	_redraw();
});

var _redraw = function(){
	var $grid = $("#grid");
	var _side = (($(window).innerWidth()-$grid.outerWidth())/2);
	if ($grid.outerHeight()+(_side*2) < $(window).innerHeight()) {
		$('#grid').css('margin', Math.floor(($(window).innerHeight()-$grid.outerHeight())/2)+"px auto");
	} else {
		$('#grid').css('margin', _side+"px auto");
	}
	var _top = (($(window).innerWidth()-$('#grid').outerWidth())/2);
}
var _template = '<div id="node-{{id}}" class="item {{#active}}active{{/active}}{{^active}}inactive{{/active}}"><div class="grid-item clearfix"><h1 class="clearfix"><span class="service">{{service}}</span><span class="node">{{node}}</span></h1><ul class="content"><li class="count"><span>signals</span> <strong>{{count}}</strong></li><li class="age"><span>known</span> <strong>{{age}}</strong></li><li class="updated"><span>last signal</span> <strong>{{updated}}</strong></li><li class="uptime"><span>uptime</span> <strong>{{uptime}}</strong></li></ul></div></div>';

var _handle = function(node){

	var $grid = $("#grid");
	var $node = $('#node-'+node.id);

	if ($node.length > 0) {

		if ($node.hasClass("active") && node.active === false) {
			$node.removeClass("active").addClass("inactive");
		}

		if ($node.hasClass("inactive") && node.active === true) {
			$node.removeClass("inactive").addClass("active");
		}
		
		$("li.count strong", $node).text(node.count);
		$("li.uptime strong", $node).text(moment(node.lastreset).fromNow(true));
		$("li.age strong", $node).text(moment(node.created).fromNow(true));
		$("li.updated strong", $node).text(moment().diff(node.updated, 'seconds', true).toFixed(1)+"s");

	} else {
		
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
		
		$grid.prepend($node);
		$grid.masonry("prepended", $node);
	}
	
	_redraw();

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

