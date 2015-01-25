
$(document).ready(function(){
	var ui = UI();

	var _last = (new Date()).getTime();
	var _fails = 0;

	var socket = io.connect();
	socket.on('nodes', function(nodes) {
		nodes.forEach(function(node){
			ui.update(node);
		});
	});
	
	socket.on('info', function(node){
		_last = (new Date()).getTime();
		_fails = 0;
		ui.update(node);
	});

	socket.on('inactive', function(id) {
		ui.deactivate(id);
	});

	socket.on('active', function(id) {
		ui.activate(id);
	});

	socket.on('reset', function(id) {
		ui.reset(id);
	});

	socket.on('remove', function(id){
		ui.remove(id);
	});
	
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


var _sound = new Audio('/assets/sound/eas.mp3');

var _alert = function(msg){
	_sound.play();
	$('#alert').text(msg).fadeIn('fast');
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

function UI() {
	var instances = {};
	var $container = $('#grid');

	var tileWidth  = 320;
	var tileHeight = 160;
	var margin = 20;

	var doLayout = true;

	$(window).resize(function() {
		doLayout = true;
	});

	var doLayout = true;
	setInterval(function () {
		if (doLayout) {
			_layout();
			doLayout = false;
		}
	}, 1000);

	function _layout() {
		var width  = $container.width();
		var height = $container.height();

		var instanceList = Object.keys(instances).map(function (id) { return instances[id]; })
		instanceList.sort(function (a,b) {
			if (a.data.service == b.data.service) return a.data.node < b.data.node ? -1 : 1;
			return a.data.service < b.data.service ? -1 : 1;
		})

		var tileCount = instanceList.length;
		var maxRows = Math.sqrt(tileCount)+3;
		var bestResult = {error: 1e10};
		for (var rowCount = 1; rowCount < maxRows; rowCount++) {
			var colCount = Math.ceil(tileCount/rowCount);
			var gridWidth  = margin + (margin + tileWidth )*colCount;
			var gridHeight = margin + (margin + tileHeight)*rowCount;
			var scaleFactor = Math.min(width/gridWidth, height/gridHeight);
			var error = width*height - tileWidth*tileHeight*tileCount*scaleFactor*scaleFactor;
			if (error < bestResult.error) bestResult = { error:error, rowCount:rowCount, colCount:colCount, scaleFactor:scaleFactor }
		}

		var scaleFactor = Math.min(1, bestResult.scaleFactor);
		var newTileWidth  = tileWidth *scaleFactor;
		var newTileHeight = tileHeight*scaleFactor;
		var newMargin = margin*scaleFactor;

		var offsetX = (width  - (newTileWidth  + newMargin)*bestResult.colCount + newMargin)/2;
		var offsetY = (height - (newTileHeight + newMargin)*bestResult.rowCount + newMargin)/2;

		instanceList.forEach(function (instance, index) {
			var x = index % bestResult.colCount;
			var y = Math.floor(index / bestResult.colCount);

			x = (x*(newTileWidth  + newMargin) + offsetX);
			y = (y*(newTileHeight + newMargin) + offsetY);

			if ((x != instance.x) || (y != instance.y)) {
				if (!instance.initialized) instance.$.addClass('notransition');
				instance.$.css({transform:'translate('+x+'px, '+y+'px) scale('+scaleFactor+')'})
				if (!instance.initialized) {
					instance.$.get(0).offsetHeight;
					instance.$.removeClass('notransition');
					instance.$.removeClass('hidden');
					instance.initialized = true;
				}

				instance.x = x;
				instance.y = y;
			}
		});
	}

	function updateInstance(instance) {
		var data = instance.data;
		instance.$.toggleClass(  'active',  data.active);
		instance.$.toggleClass('inactive', !data.active);
		instance.$.find('li.uptime span').text(data.active ? 'uptime' : 'downtime');
		instance.$.find('li.uptime strong').text(moment(data.active ? data.lastreset : data.updated).fromNow(true));

		var attr = instance.data.data;
		if (attr) {
			instance.$.find('li.attr').remove();
			var $ul = instance.$.find('ul.content');
			Object.keys(attr).forEach(function (key) {
				$ul.append($('<li class="attr"><span>'+key+'</span> <strong>'+attr[key]+'</strong></li>'))
			})
		};
	}

	function addInstance(data) {
		if (instances[data.id]) removeInstance(data.id);
		var instance = {};
		instances[data.id] = instance;

		instance.data = data;
		instance.$ = $('<div class="item hidden"><h1 class="clearfix"><span class="service"></span><br><span class="node"></span></h1><ul class="content"><li class="uptime"><span>uptime</span> <strong>0s</strong></li></ul></div>');

		instance.$.find('.service').text(data.service);
		instance.$.find('.node').text(data.node);
		instance.$.appendTo($container);
		instance.$.css({ width: tileWidth, height: tileHeight });
	}

	function removeInstance(id) {
		var $instance = instances[id].$;
		$instance.addClass('hidden');
		setTimeout(function () {
			$instance.remove();
		}, 2000);
		delete instances[id];
	}

	var me = {
		deactivate: function (id) {
			var instance = instances[id];
			if (!instance) return;
			instance.data.active = false;
			updateInstance(instance);
		},
		activate: function (id) {
			var instance = instances[id];
			if (!instance) return;
			instance.data.active = true;
			updateInstance(instance);
		},
		reset: function (id) {
		},
		remove: function (id) {
			var instance = instances[id];
			if (!instance) return;
			removeInstance(id);
			doLayout = true;
		},
		update: function (node) {
			var instance = instances[node.id];

			if (instance) {
				// update
				instance.data = node;
				updateInstance(instance);
			} else {
				// add
				addInstance(node);
			}
			doLayout = true;
		}
	}

	return me;
}

