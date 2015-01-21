
$(document).ready(function(){

	var _last = (new Date()).getTime();
	var _fails = 0;

	var $grid = $("#grid");

	var socket = io.connect();
	socket.on('nodes', function(nodes) {
		nodes.forEach(function(node){
			_handle(node);
		});
	});
	
	socket.on('info', function(node){
		_last = (new Date()).getTime();
		_fails = 0;
		_handle(node);
	});

	socket.on('inactive', function(id){
		$('#node-'+id).removeClass('active').addClass('inactive');
		$('#node-'+id+' li.uptime span').text('downtime');
	});

	socket.on('active', function(id){
		$('#node-'+id).removeClass('inactive').addClass('active');
		$('#node-'+id+' li.uptime span').text('uptime');
	});

	socket.on('reset', function(id){
		$('#node-'+id).addClass("info").parent().one("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(){
		    // your code when the transition has finished
			$('#node-'+id).removeClass("info");
		});
	});

	socket.on('remove', function(id){
		$grid.masonry("remove", $('#node-'+id)).masonry();
	});
	
	$('#grid').masonry({
	  columnWidth: 300,
	  itemSelector: '.item'
	});
	_redraw();
	
	/* check connection every five seconds */
	setInterval(function(){
		/* check connection anyway in case there is no item */
		$.getJSON("/check?_="+(new Date()).getTime(), function(res){
			if (res.status === true) _last = (new Date()).getTime();
		});
		if (((new Date()).getTime() - _last) > 30000) {
			_fails++;
			// nsa down
			if (_fails === 3) {
				_alert("Connection Lost!");
			}
			if (_fails > 3) {
				$.getJSON("/check?_="+(new Date()).getTime(), function(res){
					if (res.status === true) document.location.reload(true);
				});
			}
		} else {
			_fails = 0;
			$("#alert").hide();
		}
	},5000);
	
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
var _template = '<div id="node-{{id}}" class="item {{#active}}active{{/active}}{{^active}}inactive{{/active}}"><div class="grid-item clearfix"><h1 class="clearfix"><span class="service">{{service}}</span><span class="node">{{node}}</span></h1><ul class="content"><li class="uptime"><span>{{#active}}uptime{{/active}}{{^active}}downtime{{/active}}</span> <strong>{{#active}}{{uptime}}{{/active}}{{^active}}0s{{/active}}</strong></li></ul></div></div>';

var _sound = new Audio('/assets/sound/eas.mp3');

var _alert = function(msg){
	_sound.play();
	$('#alert').text(msg).fadeIn('fast');
}

var _handle = function(node){

	var $grid = $("#grid");
	var $node = $('#node-'+node.id);

	if ($node.length > 0) {

		if ($node.hasClass("active") && node.active === false) {
			$node.removeClass("active").addClass("inactive");
			$("li.uptime span", $node).text("downtime");
		}

		if ($node.hasClass("inactive") && node.active === true) {
			$node.removeClass("inactive").addClass("active");
			$("li.uptime span", $node).text("uptime");
		}
		
		$("li.uptime strong", $node).text(moment(node.active ? node.lastreset : node.updated).fromNow(true));

		if (node.hasOwnProperty("data") && Object.keys(node.data).length > 0) {
			for (var key in node.data) if (node.data.hasOwnProperty(key)) {
				$('strong', '#'+node.id+'-'+key.replace(/[^a-z0-9]/gi,'-')).text(node.data[key]);
			}
		}

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

		if (node.hasOwnProperty("data") && Object.keys(node.data).length > 0) {
			for (var key in node.data) if (node.data.hasOwnProperty(key)) {
				var _key = key.replace(/[^a-z0-9]/gi,'-');
				$("ul.content", $node).append('<li id="'+node.id+'-'+_key+'"><span>'+key+'</span> <strong>'+node.data[key]+'</strong></li>');
			}
		}
		
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

