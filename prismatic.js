var INTERVAL_MS_CHECK_CURRRENT_TIME = 5;
var MARGIN_S_CHECK_MOVE_ACTION = 0.02;

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
  this.jsonFileUrl = options.jsonFileUrl || 'data.json';
  this.debug = options.debug || false;

  this.player = document.getElementById(this.videoId);
  var prismatic = this;
  setInterval(function (t) {
    if (prismatic.player.readyState > 0) {
      prismatic.duration = prismatic.player.duration;
      clearInterval(t);
    }
  }, 500);

  if (options.debug) {
    window.prismatic = this;
  }
}

/**
 * Set video currentTime
 */
Prismatic.prototype.setCurrentTime = function (to) {
  if (to === -1) {
    to = this.duration;
  }

  this.player.currentTime = to;
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
  if (to === -1) {
    to = this.duration;
  }

  return (current >= from - MARGIN_S_CHECK_MOVE_ACTION && current <= to + MARGIN_S_CHECK_MOVE_ACTION);
}

/**
 * Check data for a click event
 */
Prismatic.prototype.manageClick = function (data, videoCanva, val, timer, e) {
  var actualZone = {
    "leftX": parseFloat(val.coord.leftX) / parseFloat(data.baseData.baseWidth) * parseFloat(videoCanva.offsetWidth),
    "topY": parseFloat(val.coord.topY) / parseFloat(data.baseData.baseHeight) * parseFloat(videoCanva.offsetHeight),
    "rightX": parseFloat(val.coord.rightX) / parseFloat(data.baseData.baseWidth) * parseFloat(videoCanva.offsetWidth),
    "bottomY": parseFloat(val.coord.bottomY) / parseFloat(data.baseData.baseHeight) * parseFloat(videoCanva.offsetHeight),
  };

  if (this.isInZone(e.clientX, e.clientY, actualZone) && this.isInTiming(timer.starting, timer.ending, this.player.currentTime)) {
    if (val.action.jumpTo) {
      this.LOG('[' + val.name + '] Jump to  : ' + val.action.jumpTo + 's');
      this.setCurrentTime(val.action.jumpTo);
    } else if (val.action.function) {
      if (!window[val.action.function]) {
        this.ERROR('window.' + val.action.function + ' function does not exist in window scope');
      } else {
        this.LOG('[' + val.name + '] exec function  : window.' + val.action.function);
        window[val.action.function](this.player);
      }
    }
  }
}

/**
 * Handle each "move" action
 */
Prismatic.prototype.handleMoveAction = function () {
  var prismatic = this;
  setInterval(function () {
    var currentTimeValue = prismatic.player.currentTime;
    prismatic.registeredAction['move'].forEach(function (val) {
      if (currentTimeValue >= val.from - MARGIN_S_CHECK_MOVE_ACTION && currentTimeValue <= val.from + MARGIN_S_CHECK_MOVE_ACTION) {
        prismatic.LOG('[' + val.name + '] Jump to  : ' + val.to + 's');
        prismatic.setCurrentTime(val.to);
      }
    });
  }, INTERVAL_MS_CHECK_CURRRENT_TIME);
}

/**
 * Handle each "click" action
 */
Prismatic.prototype.handleClickAction = function (data) {
  var prismatic = this;
  var videoCanva = document.getElementById(prismatic.videoId);
  videoCanva.addEventListener('mousedown', function (e) {
    if (e.button === 0) {// left click
      prismatic.registeredAction['click'].forEach(function (val) {
        prismatic.manageClick(data, videoCanva, val, val.timer, e);
      });
    }
  });
}

/**
 * Handle each "menu" action
 */
Prismatic.prototype.handleMenuAction = function (data) {
  var prismatic = this;
  prismatic.registeredAction['menu'].forEach(function (menu) {
    menu.items.forEach(function (val) {
      if (prismatic.registeredAction[val.type]) {
        var fullVal = Object.assign({}, val, { timer: menu.timer });
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
Prismatic.prototype.start = function (callback) {
  var prismatic = this;
  var request = new XMLHttpRequest();

  request.open('GET', prismatic.jsonFileUrl, true);

  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      var data = JSON.parse(request.responseText);
      data.events.forEach(function (val) {
        if (prismatic.registeredAction[val.type]) {
          prismatic.registeredAction[val.type].push(val);
        } else {
          prismatic.ERROR('Action type [' + val.type + '] doesn\'t exist !');
        }
      });

      ///////////////////////////////////
      // Handle menu action
      ///////////////////////////////////
      prismatic.handleMenuAction(data);

      prismatic.LOG('---------------All events have been loaded---------------');
      prismatic.LOG(prismatic.registeredAction);
      prismatic.LOG('---------------------------------------------------------');

      ///////////////////////////////////
      // Handle move action
      ///////////////////////////////////
      prismatic.handleMoveAction();

      ///////////////////////////////////
      // Handle click action
      ///////////////////////////////////
      prismatic.handleClickAction(data);
      if (callback) {
        callback(null);
      }
    } else {
      var errMsg = 'Status ' + request.status + ' returned while retrieving data at url ' + prismatic.jsonFileUrl;
      prismatic.ERROR(errMsg);
      if (callback) {
        callback(errMsg);
      }
    }
  };

  request.onerror = function () {
    var errMsg = 'Error retrieving data at url ' + prismatic.jsonFileUrl;
    prismatic.ERROR(errMsg);
    if (callback) {
      callback(errMsg);
    }
  };

  request.send();
}
