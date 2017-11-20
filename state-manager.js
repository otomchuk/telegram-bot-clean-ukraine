var state = {};

function clearChat(chatId) {
  state[chatId] = {};
}

// Getters
function getUserLocation(chatId) {
  return Object.assign({}, state[chatId].userLocation); // state assigned to new obj
}

function getSelectedRawTypes(chatId) {
  return state[chatId].selectedRawTypes.slice(0); // state copied to new array
}

// Setters
function setUserLocation(chatId, location) {
  state[chatId].userLocation = location;
}

function setSelectedRawTypes(chatId, rawTypes) {
  state[chatId].selectedRawTypes = rawTypes;
}

exports.default = state;

module.exports = {
  clearChat: clearChat,

  getUserLocation: getUserLocation,
  getSelectedRawTypes: getSelectedRawTypes,

  setUserLocation: setUserLocation,
  setSelectedRawTypes: setSelectedRawTypes,
};
