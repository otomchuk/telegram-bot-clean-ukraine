var state = {};

function createEmptyChatStore(chatId) {
  state[chatId] = {};
}

function isChatStoreExist(chatId) {
  return !(state[chatId] === undefined);
}

// Getters
function getUserLocation(chatId) {
  return state[chatId].userLocation
    ? Object.assign({}, state[chatId].userLocation)
    : undefined; // state assigned to new obj
}

function getSelectedRawTypes(chatId) {
  return state[chatId].selectedRawTypes
    ? state[chatId].selectedRawTypes.slice(0)
    : undefined; // state copied to new array
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
  createEmptyChatStore: createEmptyChatStore,
  isChatStoreExist: isChatStoreExist,

  getUserLocation: getUserLocation,
  getSelectedRawTypes: getSelectedRawTypes,

  setUserLocation: setUserLocation,
  setSelectedRawTypes: setSelectedRawTypes,
};
