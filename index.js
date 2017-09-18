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

bot.onText(/^\/start/, function(msg) {
  var option = {
    'parse_mode': 'Markdown',
    'reply_markup': {
      'one_time_keyboard': true,
      'keyboard': [
        [
          {
            text: 'Моє розташування',
            request_location: true
          }
        ],
        ['Відмова']
      ]
    }
  };

  bot.sendMessage(msg.chat.id, 'Де ви знаходитесь?', option).then(function() {
    bot.once('location', function(msg) {
      bot.sendMessage(msg.chat.id, 'Дякую, що поділилися вашим місцем знаходження.' + [msg.location.longitude, msg.location.latitude].join(';'));
    });
  });
});
