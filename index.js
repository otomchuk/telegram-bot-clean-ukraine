const TelegramBot = require('node-telegram-bot-api');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const TOKEN = process.env.TELEGRAM_BOT_API_TOKEN;

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
  bot.sendMessage(msg.chat.id, 'Де ви знаходитесь?', option).then(function() {
    bot.once('location', function(msg) {

      // Step-1: Responce with user coordinates
      bot.sendMessage(msg.chat.id, 'Дякую, що поділилися вашим місцем знаходження.' + [msg.location.longitude, msg.location.latitude].join(';'));

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
      bot.sendMessage(msg.chat.id, 'Оберіть тип сировини, який ви хочете здати?', options).then(function() {
        bot.on('callback_query', function(rawType) {

          // Step-2: Responce with selected raw type
          bot.sendMessage(msg.chat.id, 'Ви обрали наступний тип сировини: ' + rawType.data);

          // TODO: Step-3
        });
      });
    });
  });
});
