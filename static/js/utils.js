
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months;
}

function addMonths(date, months) {
	returnDate = new Date(date.getTime());
	returnDate.setMonth(date.getMonth() + months);
	return returnDate;
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function formatSpacedStrings(str) {
    return str.replace(/ /g, '-').replace(/\//g, '-');
}