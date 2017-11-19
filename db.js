var request = require('request');

var RECYCLING_POINTS = [];

// Loading data on exporting
request('https://recyclemap.org/api/places', function (error, response, responce) {
  RECYCLING_POINTS = JSON.parse(responce);
});

var getRecyclingPointsFor = function(rawType) {
  return RECYCLING_POINTS.filter(function(recyclingPoint) {
    return recyclingPoint.categories.indexOf(rawType) !== -1;
  });
};

exports.default = RECYCLING_POINTS;

module.exports.getRecyclingPointsFor = getRecyclingPointsFor;
