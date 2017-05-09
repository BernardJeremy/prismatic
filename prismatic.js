var INTERVAL_MS_CHECK_CURRRENT_TIME = 10;
var MARGIN_S_CHECK_MOVE_ACTION = (INTERVAL_MS_CHECK_CURRRENT_TIME / 1000) * 2;

/**
 * Base object, with option init  
 */
var Prismatic = function (options) {

  this.registeredAction = {
    'move': [],
    'click': [],
    'menu': [],
  };

  if (!options) {
    options = {};
  }
  this.videoId = options.videoID || 'my-video';
  this.videoClass = options.videoClass || 'video-js';
  this.jsonFileUrl = options.jsonFileUrl || 'data.json';
  this.debug = options.debug || false;
}

/**
 * Check if a click (coord. X & Y) is in a specific zone
 */
Prismatic.prototype.isInZone = function (X, Y, zone) {
  return (X >= zone.leftX && X <= zone.rightX && Y >= zone.topY && Y <= zone.bottomY);
}

/**
 * Check if a time is inside a specific a time, given an error margin
 */
Prismatic.prototype.isInTiming = function (from, to, current) {
  return (current >= from - MARGIN_S_CHECK_MOVE_ACTION && current <= to + MARGIN_S_CHECK_MOVE_ACTION);
}

/**
 * Check data for a click event
 */
Prismatic.prototype.manageClick = function (player, data, videoCanva, val, timer, e) {
  var actualZone = {
    "leftX": parseFloat(val.coord.leftX) / parseFloat(data.baseData.baseWidth) * parseFloat(videoCanva.width()),
    "topY": parseFloat(val.coord.topY) / parseFloat(data.baseData.baseHeight) * parseFloat(videoCanva.height()),
    "rightX": parseFloat(val.coord.rightX) / parseFloat(data.baseData.baseWidth) * parseFloat(videoCanva.width()),
    "bottomY": parseFloat(val.coord.bottomY) / parseFloat(data.baseData.baseHeight) * parseFloat(videoCanva.height()),
  };

  if (this.isInZone(e.clientX, e.clientY, actualZone) && this.isInTiming(timer.starting, timer.ending, player.currentTime())) {
    if (val.action.jumpTo) {
      this.LOG('[' + val.name + '] Jump to  : ' + val.action.jumpTo + 's');
      player.currentTime(val.action.jumpTo);
    }
  }
}

/**
 * Handle each "move" action
 */
Prismatic.prototype.handleMoveAction = function (player) {
  var prismatic = this;
  setInterval(function () {
    var currentTimeValue = player.currentTime();
    $.each(prismatic.registeredAction['move'], function (key, val) {
      if (currentTimeValue >= val.from - MARGIN_S_CHECK_MOVE_ACTION && currentTimeValue <= val.from + MARGIN_S_CHECK_MOVE_ACTION) {
        prismatic.LOG('[' + val.name + '] Jump to  : ' + val.to + 's');        
        player.currentTime(val.to);
      }
    });
  }, INTERVAL_MS_CHECK_CURRRENT_TIME);
}

/**
 * Handle each "click" action
 */
Prismatic.prototype.handleClickAction = function (data, player) {
  var prismatic = this;
  var videoCanva = $('.' + prismatic.videoClass);
  videoCanva.click(function (e) {
    $.each(prismatic.registeredAction['click'], function (key, val) {
      prismatic.manageClick(player, data, videoCanva, val, val.timer, e);
    });
  });
}

/**
 * Handle each "menu" action
 */
Prismatic.prototype.handleMenuAction = function (data, player) {
  var prismatic = this;
  $.each(prismatic.registeredAction['menu'], function (key, menu) {
    $.each(menu.items, function (key, val) {
      if (prismatic.registeredAction[val.type]) {
        var fullVal = Object.assign({}, val, {timer: menu.timer});
        prismatic.registeredAction[val.type].push(fullVal);
      } else {
        prismatic.ERROR('Action type [' + val.type + '] from menu [' + menu.name + '] doesn\'t exist !');
      }
    });
  });
}

/**
 * Print log only if debug flag is set to true
 */
Prismatic.prototype.LOG = function (...data) {
  if (this.debug) {
    console.log(...data)
  }
}

/**
 * Print log with error level, only if debug flag is set to true
 */
Prismatic.prototype.ERROR = function (...data) {
  if (this.debug) {
    console.error(...data)
  }
}

/**
 * Start everything to handle each wanted action
 */
Prismatic.prototype.start = function () {
  var prismatic = this;
  videojs('#' + this.videoId).ready(function () {
    var player = this;
    window._player = player; // Debug purpose
    $.getJSON(prismatic.jsonFileUrl, function (data) {

      $.each(data.events, function (key, val) {
        if (prismatic.registeredAction[val.type]) {
          prismatic.registeredAction[val.type].push(val);
        } else {
          prismatic.ERROR('Action type [' + val.type + '] doesn\'t exist !');
        }
      });

      ///////////////////////////////////
      // Handle menu action
      ///////////////////////////////////
      prismatic.handleMenuAction(data, player);
      
      prismatic.LOG('---------------All events have been loaded---------------');
      prismatic.LOG(prismatic.registeredAction);
      prismatic.LOG('---------------------------------------------------------');

      ///////////////////////////////////
      // Handle move action
      ///////////////////////////////////
      prismatic.handleMoveAction(player);

      ///////////////////////////////////
      // Handle click action
      ///////////////////////////////////
      prismatic.handleClickAction(data, player);
    });
  });
}
