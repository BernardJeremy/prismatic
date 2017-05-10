function copyToClipboard(text) {
  window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

document.addEventListener("DOMContentLoaded", function () {
  var videoElement = document.getElementsByClassName('editor')[0];
  var emptyObj = {
    "leftX": 0,
    "topY": 0,
    "rightX": 0,
    "bottomY": 0
  };
  var currentObj = emptyObj;
  var phaseCount = 0;

  videoElement.addEventListener('mousedown', function (event) {
    var buttonNames = { 0: 'left', 1: 'middle', 2: 'right' };

    switch (buttonNames[event.button]) {
      case 'left':
        if (phaseCount === 0) {
          currentObj.leftX = event.clientX;
          currentObj.topY = event.clientY;
          ++phaseCount;
        } else if (phaseCount === 1) {
          currentObj.rightX = event.clientX;
          currentObj.bottomY = event.clientY;

          var obj = {
            "name": "",
            "type": "click",
            "action": {
              "jumpTo": 0
            },
            "coord": {}
          };
          Object.assign(obj.coord, currentObj);
          copyToClipboard(JSON.stringify(obj));

          currentObj = emptyObj;
          phaseCount = 0;
          console.log('Current edition object has been cleared');
        }
        break;

      case 'middle':
        var rect = videoElement.getBoundingClientRect();
        var obj = { "baseData": { "baseWidth": rect.width, "baseHeight": rect.height } };
        copyToClipboard(JSON.stringify(obj));
        break;

      case 'right':
        break;

      default:
        console.log('Unhandled click type');
    }
  });

  console.log('prismatic-editor load and ready !');

});