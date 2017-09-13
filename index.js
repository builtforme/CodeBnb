const spreadsheet = require('./spreadsheet');

function run() {
  spreadsheet.readSpreadsheet();
}

module.exports = {
  run: run
}
