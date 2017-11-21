function Deg2Rad(deg) {
  return deg * Math.PI / 180;
}

function PythagorasEquirectangular(lat1, lng1, lat2, lng2) {
  lat1 = Deg2Rad(lat1);
  lat2 = Deg2Rad(lat2);
  lng1 = Deg2Rad(lng1);
  lng2 = Deg2Rad(lng2);
  var R = 6371; // km
  var x = (lng2 - lng1) * Math.cos((lat1 + lat2) / 2);
  var y = (lat2 - lat1);
  var d = Math.sqrt(x * x + y * y) * R;
  return d;
}

function findClosestLocation(list, location) {
  var mindif = 99999;
  var closestLocationIndex = 0;

  for (var index = 0; index < list.length; index += 1) {
    var dif = PythagorasEquirectangular(
      location.lat, location.lng, list[index].loc.coordinates[1], list[index].loc.coordinates[0]
    );

    if (dif < mindif) {
      closestLocationIndex = index;
      mindif = dif;
    }
  }

  return list[closestLocationIndex];
}

function replyWithDelay(delay, func, ...args) {
  // NOTE: debounce effect
  // ISSUE: fix for multiple call of stepTwoChooseRawType
  // REPRODUCE: /start was canceled or called multiple times in a row
  clearTimeout(this[func.name]);
  this[func.name] = setTimeout(function() { func(...args); }, delay);
}

module.exports = {
  findClosestLocation: findClosestLocation,
  replyWithDelay: replyWithDelay,
};
