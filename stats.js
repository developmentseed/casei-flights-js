'use strict';

const getMax = (arr) => {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
};

const getMin = (arr) => {
  let len = arr.length;
  let min = Infinity;

  while (len--) {
    min = arr[len] < min ? arr[len] : min;
  }
  return min;
};

const getStats = (arr) => {
  return {
    max: getMax(arr),
    min: getMin(arr),
    avg: arr.reduce((a,b) => a + b, 0) / arr.length
  };
};

module.exports = {
  getStats,
};