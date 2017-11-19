const TelegramBot = require('node-telegram-bot-api');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const TOKEN = process.env.TELEGRAM_BOT_API_TOKEN;

var DB = require('./db.js');
var utils = require('./utils.js');

var options = {
  webHook: {
    port: process.env.PORT
  }
};

var url = process.env.APP_URL || 'https://telegram-bot-clean-ukraine.herokuapp.com:443';
var bot = new TelegramBot(TOKEN, options);

bot.setWebHook(url + '/bot' + TOKEN);

var userLocation = {};
var selectedRawType = '';

// On command '/start'
bot.onText(/^\/start/, function(msg) {
  stepOneGetUserLocation(msg.chat.id).then(function() {
    bot.once('location', function(msg) {
      userLocation.lat = msg.location.latitude;
      userLocation.lng = msg.location.longitude;

      stepTwoChooseRawType(msg.chat.id);
    });
  });
});

bot.on('callback_query', function(callbackQuery) {
  var msg = callbackQuery.message;
  selectedRawType = callbackQuery.data;

  sendStepTwoResponce(msg.chat.id, callbackQuery, userLocation);

  setTimeout(function() {
    stepThreeChooseWhatToDo(msg.chat.id);
  }, 3000);
});

var showAllRecyclingPoint = 'список найближчих пунктів';
var newSearchRequest = 'новий пошук';
var stop = 'завершити';

bot.on('message', function(msg) {
  if (msg.text) {
    if (msg.text.toLowerCase().includes(showAllRecyclingPoint)) {
      var recyclingPoints = DB.getRecyclingPointsFor(selectedRawType);
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
  }
});

function stepOneGetUserLocation(chatId) {
  // Options for displaying keyboard that asks users to share location
  var option = {
    'parse_mode': 'Markdown',
    'reply_markup': {
      'one_time_keyboard': true,
      'keyboard': [
        [{ text: 'Моє розташування', request_location: true }],
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
  var recyclingPoints = DB.getRecyclingPointsFor(callbackQuery.data);
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
  var option = {
    'parse_mode': 'Markdown',
    'reply_markup': {
      'one_time_keyboard': true,
      'keyboard': [
        ['Покажи список найближчих пунктів'],
        ['Новий пошук', 'Завершити роботу']
      ]
    }
  };

  return bot.sendMessage(chatId, 'Вам підходить цей пункт прийому?', option);
}
