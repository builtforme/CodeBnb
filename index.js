const spreadsheet = require('./spreadsheet');

function run() {
  require('lambda-git')().then(() => {
    console.log('git should now be installed and available for use');
    spreadsheet.readSpreadsheet();
  });
}

module.exports = {
  run: run
}
