const spreadsheet = require('./spreadsheet');

function run() {
  require('lambda-git')().then(() => {
    console.log('git should be installed and available for use');
    spreadsheet.readSpreadsheet();
  });
}

module.exports = {
  run: run
}
