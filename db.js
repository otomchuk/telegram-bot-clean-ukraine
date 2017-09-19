var RECYCLING_POINTS = [
  {
    acceptableRawTypes: ['plastic', 'paper', 'glass', 'metal'],
    lat: 49.810878,
    lng: 24.020105,
    description: 'Персенківка, 2'
  },
  {
    acceptableRawTypes: ['plastic', 'glass', 'paper'],
    lat: 49.815259,
    lng: 24.014142,
    description: 'Лазаренка, 29'
  },
  {
    acceptableRawTypes: ['glass', 'paper'],
    lat: 49.807656,
    lng: 24.016985,
    description: 'Володимира Великого, 3'
  },
  {
    acceptableRawTypes: ['plastic', 'paper'],
    lat: 49.859558,
    lng: 24.043563,
    description: 'Промислова, 27'
  },
  {
    acceptableRawTypes: ['paper', 'glass'],
    lat: 49.829054,
    lng: 23.937564,
    description: 'Конюшинна,4'
  },
  {
    acceptableRawTypes: ['plastic'],
    lat: 49.833901,
    lng: 23.982037,
    description: 'Кузневича, 4'
  },
  {
    acceptableRawTypes: ['plastic', 'glass', 'paper'],
    lat: 49.831019,
    lng: 23.946927,
    description: 'Данила Апостола, 6а'
  },
];

var getRecyclingPointsFor = function(rawType) {
  return RECYCLING_POINTS.filter(function(recyclingPoint) {
    return recyclingPoint.acceptableRawTypes.indexOf(rawType) !== -1;
  });
};

exports.default = RECYCLING_POINTS;

module.exports.getRecyclingPointsFor = getRecyclingPointsFor;
