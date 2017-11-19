var request = require('request');

function getLocationPredictions(location) {
  var requestUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' +
    encodeURIComponent(location) +
    '&types=geocode&components=country:UA&language=uk&key=' +
    process.env.GOOGLE_PLACES_API_TOKEN;

  return new Promise(function(resolve) {
    request(requestUrl, function (error, response, responce) {
      var parsedResponce = JSON.parse(responce);
      resolve(parsedResponce.predictions);
    });
  });
}

function getLocationDetails(locationId) {
  var requestUrl = 'https://maps.googleapis.com/maps/api/place/details/json?placeid=' +
  locationId +
  '&components=country:UA&language=uk&key=' +
  process.env.GOOGLE_PLACES_API_TOKEN;

  return new Promise(function(resolve) {
    request(requestUrl, function (error, response, responce) {
      var parsedResponce = JSON.parse(responce);
      resolve(parsedResponce.result);
    });
  });
}

module.exports = {
  getLocationPredictions: getLocationPredictions,
  getLocationDetails: getLocationDetails,
};
