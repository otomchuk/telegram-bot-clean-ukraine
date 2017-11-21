var CONSTANTS = {};

CONSTANTS.HUMAN_FRIENDLY_MATERIALS = {
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

// Buttons
CONSTANTS.BUTTON_SHARE_LOCATION = 'Поширити моє місцезнаходження';
CONSTANTS.BUTTON_WRITE_LOCATION_MANUALLY = 'Ввести вручну';
CONSTANTS.BUTTON_PAPER = '1. Папір';
CONSTANTS.BUTTON_GLASS = '2. Скло';
CONSTANTS.BUTTON_PLASTIC = '3. Пластик';
CONSTANTS.BUTTON_METAL = '4. Метал';
CONSTANTS.BUTTON_CLOSEST_RECYCLE_POINTS = 'Покажи список найближчих пунктів';
CONSTANTS.BUTTON_NEW_SEARCH = 'Новий пошук';
CONSTANTS.BUTTON_END_SEARCH = 'Завершити роботу';

// Questions
CONSTANTS.QUESTION_YOUR_LOCATION = 'Де ви знаходитесь?';
CONSTANTS.QUESTION_CHOOSE_RAW_TYPES = 'Оберіть тип сировини, який ви хочете здати.\n\n';
CONSTANTS.QUESTION_IS_SUITABLE_FOR_YOU = 'Вам підходить цей пункт прийому?';

// Responces
CONSTANTS.RESPONCE_CLOSEST_RECYCLE_POINT = 'Найближчий пункт для прийому:\n\n';
CONSTANTS.RESPONCE_THANKS = 'Дякуємо за те, що сортуєте сміття!';
CONSTANTS.RESPONCE_MULTIPLE_LOCATIONS_FOUND = 'Було знайдено декілька адрес.' +
  ' Будь ласка, оберіть адресу зі списку, або введіть ще раз.';

// Helps
CONSTANTS.HELP_COMMAND_LOCATION = 'Для того, щоб задати місце розташування вручну' +
  ' введіть команду /location та зазнaчте місто, вулицю, будинок через кому.\n\n' +
  'Наприклад:\n' +
  '/location Львів, Площа ринок, 1\n';

CONSTANTS.HELP_COMMAND_MATERIALS = 'Для того, щоб задати матеріали вручну' +
  ' введіть команду /materials та зазнaчте їх назви або номери через кому.\n\n' +
  'Наприклад:\n' +
  '/materials папір, пластик, метал\n' +
  '/materials 1, 3, 4';

// Errors
CONSTANTS.ERROR_ADDRESS_IS_EMPTY = 'Адреса не може бути порожньою.\n\n';
CONSTANTS.ERROR_MATERIALS_ARE_EMPTY = 'Ви не вказали жодного матеріалу.\n\n';
CONSTANTS.ERROR_ADDRESS_IS_INVALID = 'Ми не можемо розпізнати введене вами місцерозташування.';

CONSTANTS.ERROR_LOCATION_NOT_SPECIFIED = 'Перед тим як вказати матеріали,' +
  ' будь ласка, зазначте місцерозташування поширивши його після запуску команди /start' +
  ', aбо вручню за допомогою комади /location.';

CONSTANTS.ERROR_CHAT_STORE_IS_EMPTY = 'Упс, ми вже забули нашу останню переписку.' +
  ' Будь ласка, введіть команду /start для початку пошуку пунтку прийому' +
  ', або команду /location щоб задати ваше місцерозташування вручну.';

exports.default = CONSTANTS;
