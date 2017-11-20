const TelegramBot = require('node-telegram-bot-api');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const TELEGRAM_BOT_API_TOKEN = process.env.TELEGRAM_BOT_API_TOKEN;

var db = require('./db.js');
var placesAPI = require('./places-api.js');
var utils = require('./utils.js');

var options = {
  webHook: {
    port: process.env.PORT
  }
};

var url = process.env.APP_URL || 'https://telegram-bot-clean-ukraine.herokuapp.com:443';
var bot = new TelegramBot(TELEGRAM_BOT_API_TOKEN, options);

bot.setWebHook(url + '/bot' + TELEGRAM_BOT_API_TOKEN);

var state = {};
var stepTwoDebounce;

// On command '/start'
bot.onText(/^\/start/, function(msg) {
  state[msg.chat.id] = {}; // clear data inside state

  stepOneGetUserLocation(msg.chat.id).then(function() {
    bot.once('location', function(msg) {
      state[msg.chat.id].userLocation = {
        lat: msg.location.latitude,
        lng: msg.location.longitude,
      };

      // NOTE: that is a fix for multiple call of stepTwoChooseRawType after /start was canceled
      clearTimeout(stepTwoDebounce);
      stepTwoDebounce = setTimeout(function() {
        stepTwoChooseRawType(msg.chat.id);
      }, 500);
    });
  });
});

bot.onText(/^\/location/, function(msg) {
  var location = msg.text.replace('/location', '').trim();

  handleLocationCommand(msg.chat.id, msg.message_id, location);
});

bot.on('callback_query', function(callbackQuery) {
  var msg = callbackQuery.message;
  // TODO: check if state[msg.chat.id] exist and wasn't erased by /start command
  state[msg.chat.id].selectedRawType = callbackQuery.data;

  sendStepTwoResponce(msg.chat.id, callbackQuery, state[msg.chat.id].userLocation);

  setTimeout(function() {
    stepThreeChooseWhatToDo(msg.chat.id);
  }, 3000);
});

var showAllRecyclingPoint = 'список найближчих пунктів';
var newSearchRequest = 'новий пошук';
var enterLocationManually = 'вручну';
var stop = 'завершити';

bot.on('message', function(msg) {
  if (msg.text) {
    if (msg.text.toLowerCase().includes(showAllRecyclingPoint)) {
      var recyclingPoints = db.getRecyclingPointsFor(state[msg.chat.id].selectedRawType);
      recyclingPoints = recyclingPoints.slice(0, 3); // send olny first three RecyclingPoints
      var response = '';

      recyclingPoints.forEach(function(point) {
        response = response.concat(point.description + '\n\n');
      });

      bot.sendMessage(msg.chat.id, response);
    }

    if (msg.text.toLowerCase().indexOf(newSearchRequest) === 0) {
      stepTwoChooseRawType(msg.chat.id);
    }

    if (msg.text.toLowerCase().includes(stop)) {
      bot.sendMessage(msg.chat.id, 'Дякуємо за те, що сортуєте сміття!');
    }

    if(msg.text.toLowerCase().includes(enterLocationManually)) {
      sendCommandExplanation(msg.chat.id, '/location');
    }
  }
});

function stepOneGetUserLocation(chatId) {
  // Options for displaying keyboard that asks users to share location
  var option = {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        [{ text: 'Поширити моє місцезнаходження', request_location: true }],
        ['Ввести вручну'],
        ['Відмова']
      ]
    }
  };

  // Step-1: where are you located
  return bot.sendMessage(chatId, 'Де ви знаходитесь?', option);
}

function stepTwoChooseRawType(chatId) {
  // Options for displaying keyboard that asks user to choose raw types
  var options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '/1. Папір', callback_data: 'paper' },
          { text: '/2. Скло', callback_data: 'glass' }
        ],
        [
          { text: '/3. Пластик', callback_data: 'plastics' },
          { text: '/4. Метал', callback_data: 'metals' }
        ],
      ]
    }
  };

  // Step-2: choose raw material that you would like to give for recycling
  return bot.sendMessage(chatId, 'Оберіть тип сировини, який ви хочете здати?', options);
}

// Step-2: responce with closes recycling point
function sendStepTwoResponce(chatId, callbackQuery, userLocation) {
  var recyclingPoints = db.getRecyclingPointsFor(callbackQuery.data);
  var closesRecyclingPoint = utils.findClosestLocation(recyclingPoints, userLocation.lat, userLocation.lng);

  // Step-2: Responce with closes recycing point
  bot.answerCallbackQuery(callbackQuery.id).then(function() {
    bot.sendMessage(chatId, 'Найближчий пункт для прийому:\n\n' + closesRecyclingPoint.description);
  });

  setTimeout(function() {
    bot.sendLocation(chatId, closesRecyclingPoint.loc.coordinates[1], closesRecyclingPoint.loc.coordinates[0]);
  }, 1000);
}

function stepThreeChooseWhatToDo(chatId) {
  // Options for displaying keyboard that asks about next steps
  var options = {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        ['Покажи список найближчих пунктів'],
        ['Новий пошук', 'Завершити роботу']
      ]
    }
  };

  return bot.sendMessage(chatId, 'Вам підходить цей пункт прийому?', options);
}

function handleLocationCommand(chatId, msgId, location) {
  if (location.length > 0) {
    placesAPI.getLocationPredictions(location).then(function(locationPredictions) {
      if (locationPredictions.length > 1) {
        generateKeyboardForPredictions(chatId, locationPredictions).then(function() {
          bot.once('message', function(reply) {
            handleLocationCommand(chatId, reply.message_id, reply.text);
          });
        });
      } else {
        placesAPI.getLocationDetails(locationPredictions[0].place_id).then(function(place) {
          state[chatId].userLocation = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };

          // NOTE: reply with map, so user could see his location
          bot.sendLocation(
            chatId,
            place.geometry.location.lat,
            place.geometry.location.lng,
            { reply_to_message_id: msgId }
          );

          setTimeout(function() {
            stepTwoChooseRawType(chatId);
          }, 1000);
        });
      }
    });
  } else {
    sendCommandExplanation(
      chatId,
      '/location',
      'Адреса не може бути порожньою.\n\n'
    );
  }
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
    'Було знайдено декілька адрес. Будь ласка, оберіть адресу зі списку, або введіть ще раз.',
    options
  );
}

function sendCommandExplanation(chatId, command, message) {
  switch (command) {
  case '/location':
    var commandExplanation = 'Для того, щоб задати місце розташування вручну' +
    ' введіть команду /location та зазнечте місто, вулию, будинок через кому.\n' +
    'Наприклад:\n' +
    '/location Львів, Площа ринок, 1\n';
    (message !== undefined)
      ? bot.sendMessage(chatId, message + commandExplanation)
      : bot.sendMessage(chatId, commandExplanation);
    break;
    // no default
  }
}
