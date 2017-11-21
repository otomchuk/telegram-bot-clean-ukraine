var TelegramBot = require('node-telegram-bot-api');

// Communications with third-party API
var db = require('./db.js');
var placesAPI = require('./places-api.js');

// Internal imports
var state = require('./state-manager.js');
var utils = require('./utils.js');

var CONSTANTS = require('./constants.js').default;

// Config dotenv only for development environment
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

var botOptions = {
  webHook: {
    port: process.env.PORT
  }
};

var bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN, botOptions);
bot.setWebHook(process.env.APP_URL + '/bot' + process.env.TELEGRAM_BOT_API_TOKEN);

// On command '/start'
bot.onText(/^\/start|\/s/, function(msg) {
  state.createEmptyChatStore(msg.chat.id);

  stepOneGetUserLocation(msg.chat.id).then(function() {
    bot.once('location', function(msg) {
      var location = {
        lat: msg.location.latitude,
        lng: msg.location.longitude,
      };

      state.setUserLocation(msg.chat.id, location);

      utils.replyWithDelay(500, stepTwoChooseRawType, msg.chat.id);
    });
  });
});

// On command '/location'
bot.onText(/^\/location|\/l/, function(msg) {
  if (!state.isChatStoreExist(msg.chat.id)) state.createEmptyChatStore(msg.chat.id);
  var desiredLocation = msg.text.replace(/^\/location|\/l/, '').trim();

  desiredLocation.length > 0
    ? setUserLocationManually(msg.chat.id, msg.message_id, desiredLocation)
      .then(function() {
        utils.replyWithDelay(1000, stepTwoChooseRawType, msg.chat.id);
      })
    : sendCommandExplanation(
      msg.chat.id,
      '/location',
      CONSTANTS.ERROR_ADDRESS_IS_EMPTY
    );
});

// On command '/materials'
bot.onText(/^\/materials|\/m/, function(msg) {
  if (state.isChatStoreExist(msg.chat.id) && state.getUserLocation(msg.chat.id)) {
    var message = msg.text.replace(/^\/materials|\/m/, '').trim().toLowerCase();
    // remove bot command from materials text

    if (message.length > 0) {
      // remove multiple spaces, comma + space and spaces for command and split it to array
      var rawTypes = message.replace(/\s\s+|,\s|\s/g, ',').split(',');
      var selectedRawTypes = rawTypes.map(function(rawType) {
        return CONSTANTS.HUMAN_FRIENDLY_MATERIALS[rawType];
      });

      state.setSelectedRawTypes(msg.chat.id, selectedRawTypes);

      sendStepTwoResponce(msg.chat.id);
    } else {
      sendCommandExplanation(
        msg.chat.id,
        '/materials',
        CONSTANTS.ERROR_MATERIALS_ARE_EMPTY
      );
    }
  } else {
    bot.sendMessage(
      msg.chat.id,
      CONSTANTS.ERROR_LOCATION_NOT_SPECIFIED
    );
  }
});

// On inline_keyboard button click
bot.on('callback_query', function(callbackQuery) {
  var msg = callbackQuery.message;

  bot.answerCallbackQuery(callbackQuery.id).then(function() {
    // NOTE: inline_keyboard in always visible at chat history, that's why we need to check store
    if (state.isChatStoreExist(msg.chat.id)) {
      // NOTE: selectedRawTypes should be an array, because getRecyclingPointsFor requires it
      state.setSelectedRawTypes(msg.chat.id, [callbackQuery.data]);
      sendStepTwoResponce(msg.chat.id);
    } else {
      bot.sendMessage(
        msg.chat.id,
        CONSTANTS.ERROR_CHAT_STORE_IS_EMPTY
      );
    }
  });
});

function stepOneGetUserLocation(chatId) {
  // Options for displaying keyboard that asks users to share location
  var options = {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        [{ text: CONSTANTS.BUTTON_SHARE_LOCATION, request_location: true }],
        [CONSTANTS.BUTTON_WRITE_LOCATION_MANUALLY],
      ]
    }
  };

  // Step-1: where are you located
  return bot.sendMessage(chatId, CONSTANTS.QUESTION_YOUR_LOCATION, options)
    .then(function() {
      bot.once('message', function(reply) {
        if (reply.text === CONSTANTS.BUTTON_WRITE_LOCATION_MANUALLY) {
          var newOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [{ text: CONSTANTS.BUTTON_SHARE_LOCATION, request_location: true }],
              ]
            }
          };

          sendCommandExplanation(
            reply.chat.id,
            '/location',
            undefined,
            newOptions
          );
        }
      });
    });
}

function stepTwoChooseRawType(chatId) {
  // Options for displaying keyboard that asks user to choose raw types
  var options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: CONSTANTS.BUTTON_PAPER, callback_data: 'paper' },
          { text: CONSTANTS.BUTTON_GLASS, callback_data: 'glass' }
        ],
        [
          { text: CONSTANTS.BUTTON_PLASTIC, callback_data: 'plastics' },
          { text: CONSTANTS.BUTTON_METAL, callback_data: 'metals' }
        ],
      ]
    }
  };

  // Step-2: choose raw material that you would like to give for recycling
  return bot.sendMessage(
    chatId,
    CONSTANTS.QUESTION_CHOOSE_RAW_TYPES + CONSTANTS.HELP_COMMAND_MATERIALS,
    options
  );
}

// Step-2: responce with closes recycling point
function sendStepTwoResponce(chatId) {
  var recyclingPoints = db.getRecyclingPointsFor(state.getSelectedRawTypes(chatId));
  var closesRecyclingPoint = utils.findClosestLocation(
    recyclingPoints, state.getUserLocation(chatId)
  );

  bot.sendMessage(
    chatId,
    CONSTANTS.RESPONCE_CLOSEST_RECYCLE_POINT + generateRecyclePointDetails(closesRecyclingPoint),
    { parse_mode: 'markdown', reply_markup: { remove_keyboard: true } }
  );

  setTimeout(function() {
    bot.sendLocation(
      chatId,
      closesRecyclingPoint.loc.coordinates[1],
      closesRecyclingPoint.loc.coordinates[0]
    );
  }, 1000);

  utils.replyWithDelay(3000, stepThreeChooseWhatToDo, chatId);
}

function stepThreeChooseWhatToDo(chatId) {
  // Options for displaying keyboard that asks about next steps
  var options = {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        [CONSTANTS.BUTTON_CLOSEST_RECYCLE_POINTS],
        [CONSTANTS.BUTTON_NEW_SEARCH, CONSTANTS.BUTTON_END_SEARCH]
      ]
    }
  };

  return bot.sendMessage(chatId, CONSTANTS.QUESTION_IS_SUITABLE_FOR_YOU, options)
    .then(function() {
      bot.once('message', function(reply) {
        sendStepThreeResponce(reply.chat.id, reply.message_id, reply.text);
      });
    });
}

function sendStepThreeResponce(chatId, replyMsgId, msgText) {
  if (msgText === CONSTANTS.BUTTON_CLOSEST_RECYCLE_POINTS) {
    var recyclingPoints = db.getRecyclingPointsFor(state.getSelectedRawTypes(chatId));
    // TODO: send closest recycle points instead of first three from db list
    recyclingPoints = recyclingPoints.slice(0, 3); // send olny first three RecyclingPoints

    var response = '';
    recyclingPoints.forEach(function(point) {
      response += generateRecyclePointDetails(point, { isShort: true }) + '\n\n';
    });

    bot.sendMessage(
      chatId,
      response,
      { parse_mode: 'markdown', reply_markup: { remove_keyboard: true } }
    );
  }

  if (msgText === CONSTANTS.BUTTON_NEW_SEARCH) {
    stepTwoChooseRawType(chatId);
  }

  if (msgText === CONSTANTS.BUTTON_END_SEARCH) {
    bot.sendMessage(
      chatId,
      CONSTANTS.RESPONCE_THANKS,
      { reply_to_message_id: replyMsgId, reply_markup: { remove_keyboard: true } }
    );
  }
}

function setUserLocationManually(chatId, msgId, desiredLocation) {
  return new Promise(function (resolve, reject) {
    placesAPI.getLocationPredictions(desiredLocation).then(function(locationPredictions) {
      switch (locationPredictions.length) {
      case 0:
        reject (
          bot.sendMessage(
            chatId,
            CONSTANTS.ERROR_ADDRESS_IS_INVALID
          )
        );
        break;
      case 1:
        placesAPI.getLocationDetails(locationPredictions[0].place_id).then(function(place) {
          var location = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };

          state.setUserLocation(chatId, location);

          // NOTE: reply with map, so user could see his location
          resolve (
            bot.sendLocation(
              chatId,
              place.geometry.location.lat,
              place.geometry.location.lng,
              { reply_to_message_id: msgId }
            )
          );
        });
        break;
      default:
        generateKeyboardForPredictions(chatId, locationPredictions).then(function() {
          bot.once('message', function(reply) {
            resolve (
              setUserLocationManually(chatId, reply.message_id, reply.text)
            );
          });
        });
      }
    });
  });
}

function generateKeyboardForPredictions(chatId, predictions) {
  var options = {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      keyboard: []
    }
  };

  options.reply_markup.keyboard = predictions.map(function(prediction) {
    return [prediction.description];
  });

  return bot.sendMessage(
    chatId,
    CONSTANTS.RESPONCE_MULTIPLE_LOCATIONS_FOUND,
    options
  );
}

function generateRecyclePointDetails(recyclePoint, isShort) {
  var recyclePointDetails = '';

  recyclePointDetails += '*' + recyclePoint.name + '*\n';
  if (isShort === undefined) recyclePointDetails += recyclePoint.description + '\n\n';

  if (isShort !== undefined && recyclePoint.address) recyclePointDetails
    += '*Адреса:* ' + recyclePoint.address + '\n';
  if (recyclePoint.phone) recyclePointDetails += '*Телефон:* ' + recyclePoint.phone + '\n';
  if (recyclePoint.email) recyclePointDetails += '*email:* ' + recyclePoint.email + '\n';
  if (recyclePoint.website) recyclePointDetails +=
    '*Сайт:* [' + recyclePoint.website + '](' + recyclePoint.website + ')\n';
  if (recyclePoint.workingHours) recyclePointDetails +=
    '*Години роботи:* ' + recyclePoint.workingHours;

  return recyclePointDetails;
}

function sendCommandExplanation(chatId, command, message, options) {
  switch (command) {
  case '/location':
    (message !== undefined)
      ? bot.sendMessage(chatId, message + CONSTANTS.HELP_COMMAND_LOCATION, options)
      : bot.sendMessage(chatId, CONSTANTS.HELP_COMMAND_LOCATION, options);
    break;
  case '/materials':
    (message !== undefined)
      ? bot.sendMessage(chatId, message + CONSTANTS.HELP_COMMAND_MATERIALS, options)
      : bot.sendMessage(chatId, CONSTANTS.HELP_COMMAND_MATERIALS, options);
    break;
    // no default
  }
}
