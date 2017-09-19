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

// On command '/start'
bot.onText(/^\/start/, function(msg) {
  stepOneGetUserLocation(msg).then(function() {
    bot.once('location', function(msg) {

      var userLocation = {
        lat: msg.location.latitude,
        lng: msg.location.longitude
      };

      stepTwoChooseRawType(msg).then(function() {
        bot.on('callback_query', function(rawType) {

          sendStepTwoResponce(msg, rawType.data, userLocation);

          setTimeout(function() {
            stepThreeChooseWhatToDo(msg);
          }, 1000);
        });
      });
    });
  });
});

function stepOneGetUserLocation(msg) {
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
  return bot.sendMessage(msg.chat.id, 'Де ви знаходитесь?', option);
}

function stepTwoChooseRawType(msg) {
  // Options for displaying keyboard that asks user to choose raw types
  var options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Папір', callback_data: 'paper' },
          { text: 'Скло', callback_data: 'glass' }
        ],
        [
          { text: 'Пластик', callback_data: 'plastic' },
          { text: 'Метал', callback_data: 'metal' }
        ],
      ]
    }
  };

  // Step-2: choose raw material that you would like to give for recycling
  return bot.sendMessage(msg.chat.id, 'Оберіть тип сировини, який ви хочете здати?', options);
}

// Step-2: responce with closes recycling point
function sendStepTwoResponce(msg, rawType, userLocation) {
  var recyclingPoints = DB.getRecyclingPointsFor(rawType);
  var closesRecyclingPoint = utils.findClosestLocation(recyclingPoints, userLocation.lat, userLocation.lng);

  // Step-2: Responce with closes recycing point
  bot.sendLocation(msg.chat.id, closesRecyclingPoint.lat, closesRecyclingPoint.lng);

  setTimeout(function() {
    bot.sendMessage(msg.chat.id, 'Найближчий пункт для прийому: ' + closesRecyclingPoint.description);
  }, 500);
}

function stepThreeChooseWhatToDo(msg) {
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

  return bot.sendMessage(msg.chat.id, 'Вам підходить цей пункт прийому?', option);
}
