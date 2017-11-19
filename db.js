var request = require('request');

var recyclingPoints = [];

// Loading data on exporting
request('https://recyclemap.org/api/places', function (error, response, responce) {
  recyclingPoints = JSON.parse(responce);
});

var getRecyclingPointsFor = function(rawType) {
  return recyclingPoints.filter(function(recyclingPoint) {
    return recyclingPoint.categories.indexOf(rawType) !== -1;
  });
};

exports.default = recyclingPoints;

module.exports.getRecyclingPointsFor = getRecyclingPointsFor;
