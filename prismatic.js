var INTERVAL_MS_CHECK_CURRRENT_TIME = 10;
var MARGIN_S_CHECK_MOVE_ACTION = (INTERVAL_MS_CHECK_CURRRENT_TIME / 1000) * 2;

/**
 * Base object, with option init  
 */
var Prismatic = function (options) {

  this.registeredAction = {
    'move': [],
    'click': [],
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
 * Handle each "move" action
 */
Prismatic.prototype.handleMoveAction = function (player) {
  var currentTimeValue = player.currentTime();
  $.each(this.registeredAction['move'], function (key, val) {
    if (currentTimeValue >= val.from - MARGIN_S_CHECK_MOVE_ACTION && currentTimeValue <= val.from + MARGIN_S_CHECK_MOVE_ACTION) {
      player.currentTime(val.to);
    }
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

      prismatic.LOG(prismatic.registeredAction);

      ///////////////////////////////////
      // Handle move action
      ///////////////////////////////////
      setInterval(function () {
        prismatic.handleMoveAction(player);
      }, INTERVAL_MS_CHECK_CURRRENT_TIME);

      ///////////////////////////////////
      // Handle click action
      ///////////////////////////////////
      var videoCanva = $('.' + prismatic.videoClass);
      videoCanva.click(function (e) {
        $.each(prismatic.registeredAction['click'], function (key, val) {
          var actualZone = {
            "leftX": parseFloat(val.leftX) / parseFloat(data.baseData.baseWidth) * parseFloat(videoCanva.width()),
            "topY": val.topY / data.baseData.baseHeight * videoCanva.height(),
            "rightX": val.rightX / data.baseData.baseWidth * videoCanva.width(),
            "bottomY": parseFloat(val.bottomY) / parseFloat(data.baseData.baseHeight) * parseFloat(videoCanva.height()),
          };

          if (prismatic.isInZone(e.clientX, e.clientY, actualZone) && prismatic.isInTiming(val.starting, val.ending, player.currentTime())) {
            if (val.jumpTo) {
              prismatic.LOG('Jump to  : ' + val.jumpTo);
              player.currentTime(val.jumpTo);
            }
          }
        });

      });
    });
  });
}
