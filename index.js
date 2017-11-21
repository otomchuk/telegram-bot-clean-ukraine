var TelegramBot = require('node-telegram-bot-api');

// Communications with third-party API
var db = require('./db.js');
var placesAPI = require('./places-api.js');

// Internal imports
var state = require('./state-manager.js');
var utils = require('./utils.js');

// Constants
var HUMAN_FRIENDLY_MATERIALS = {
  1: 'paper',
  2: 'glass',
  3: 'plastics',
  4: 'metals',
  paper: 'paper',
  glass: 'glass',
  plastic: 'plastics',
  metal: 'metals',
  'папір': 'paper',
  'скло': 'glass',
  'пластик': 'plastics',
  'метал': 'metals',
};

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
      'Адреса не може бути порожньою.\n\n'
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
        return HUMAN_FRIENDLY_MATERIALS[rawType];
      });

      state.setSelectedRawTypes(msg.chat.id, selectedRawTypes);

      sendStepTwoResponce(msg.chat.id);
    } else {
      sendCommandExplanation(
        msg.chat.id,
        '/materials',
        'Ви не вказали жодного матеріалу.\n\n'
      );
    }
  } else {
    bot.sendMessage(
      msg.chat.id,
      'Перед тим як вказати матеріали, будь ласка, зазначте місцерозташування' +
      ' поширивши його після запуску команди /start' +
      ', aбо вручню за допомогою комади /location.'
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
        'Упс, ми вже забули нашу останню переписку.' +
        ' Будь ласка, введіть команду /start для початку пошуку пунтку прийому' +
        ', або команду /location щоб задати ваше місцерозташування вручну.'
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
        [{ text: 'Поширити моє місцезнаходження', request_location: true }],
        ['Ввести вручну'],
      ]
    }
  };

  // Step-1: where are you located
  return bot.sendMessage(chatId, 'Де ви знаходитесь?', options)
    .then(function() {
      bot.once('message', function(reply) {
        if (reply.text && reply.text.toLowerCase().includes('вручну')) {
          var newOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [{ text: 'Поширити моє місцезнаходження', request_location: true }],
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
          { text: '1. Папір', callback_data: 'paper' },
          { text: '2. Скло', callback_data: 'glass' }
        ],
        [
          { text: '3. Пластик', callback_data: 'plastics' },
          { text: '4. Метал', callback_data: 'metals' }
        ],
      ]
    }
  };

  // Step-2: choose raw material that you would like to give for recycling
  return bot.sendMessage(
    chatId,
    'Оберіть тип сировини, який ви хочете здати?\n\n' +
    'Також ви можете задати одночасно декілька видів сировини через кому:\n' +
    '/materials папір, пластик, метал\n' +
    '/materials 1, 3, 4',
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
    'Найближчий пункт для прийому:\n\n' + generateRecyclePointDetails(closesRecyclingPoint),
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
        ['Покажи список найближчих пунктів'],
        ['Новий пошук', 'Завершити роботу']
      ]
    }
  };

  return bot.sendMessage(chatId, 'Вам підходить цей пункт прийому?', options)
    .then(function() {
      bot.once('message', function(reply) {
        sendStepThreeResponce(reply.chat.id, reply.message_id, reply.text);
      });
    });
}

function sendStepThreeResponce(chatId, replyMsgId, msgText) {
  var showAllRecyclingPoint = 'список найближчих пунктів';
  var newSearchRequest = 'новий пошук';
  var stop = 'завершити';

  if (msgText.toLowerCase().includes(showAllRecyclingPoint)) {
    var recyclingPoints = db.getRecyclingPointsFor(state.getSelectedRawTypes(chatId));
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

  if (msgText.toLowerCase().indexOf(newSearchRequest) === 0) {
    stepTwoChooseRawType(chatId);
  }

  if (msgText.toLowerCase().includes(stop)) {
    bot.sendMessage(
      chatId,
      'Дякуємо за те, що сортуєте сміття!',
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
            'Ми не можемо розпізнати введене вами місцерозташування.'
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
    'Було знайдено декілька адрес. Будь ласка, оберіть адресу зі списку, або введіть ще раз.',
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
  var commandExplanation = undefined;
  switch (command) {
  case '/location':
    commandExplanation = 'Для того, щоб задати місце розташування вручну' +
    ' введіть команду /location та зазнечте місто, вулию, будинок через кому.\n\n' +
    'Наприклад:\n' +
    '/location Львів, Площа ринок, 1\n';
    (message !== undefined)
      ? bot.sendMessage(chatId, message + commandExplanation, options)
      : bot.sendMessage(chatId, commandExplanation, options);
    break;
  case '/materials':
    commandExplanation = 'Для того, щоб задати матеріали вручну' +
    ' введіть команду /materials та зазнечте їх назви або номери через кому.\n\n' +
    'Наприклад:\n' +
    '/materials папір, пластик, метал\n' +
    '/materials 1, 3, 4';
    (message !== undefined)
      ? bot.sendMessage(chatId, message + commandExplanation, options)
      : bot.sendMessage(chatId, commandExplanation, options);
    break;
    // no default
  }
}
