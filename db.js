var request = require('request');

var recyclingPoints = [];

// Loading data on exporting
request('https://recyclemap.org/api/places', function (error, response, responce) {
  recyclingPoints = JSON.parse(responce);
});

var getRecyclingPointsFor = function(rawTypes) {
  var filteredRecyclingPoints = null;

  if (rawTypes.length === 1) {
    filteredRecyclingPoints = recyclingPoints.filter(function(recyclingPoint) {
      return recyclingPoint.categories.indexOf(rawTypes[0]) !== -1;
    });
  } else {
    filteredRecyclingPoints = recyclingPoints.filter(function(recyclingPoint) {
      var recyclingPointAcceptRawTypes = rawTypes.map(function(rawType) {
        var isRecyclingPointAcceptRawType = recyclingPoint.categories.indexOf(rawType) !== -1;
        return isRecyclingPointAcceptRawType;
      });

      // don't add to recyclingPoints if at least one rawType is not in recyclingPoint categories
      return recyclingPointAcceptRawTypes.indexOf(false) === -1;
    });
  }

  return filteredRecyclingPoints;
};

exports.default = recyclingPoints;

module.exports.getRecyclingPointsFor = getRecyclingPointsFor;
