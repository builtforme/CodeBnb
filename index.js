const spreadsheet = require('./spreadsheet');

function run(event, context, callback) {
  if (event.httpMethod === 'GET'
    && event.queryStringParameters.githubUsername
    && event.queryStringParameters.authCode)
    require('lambda-git')().then(() => {
      console.log('git should now be installed and available for use');
      spreadsheet.startAssignment(event.queryStringParameters.authCode, event.queryStringParameters.githubUsername)
      .then(() => {
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 200,
          'headers': { 'headerName': 'headerValue' },
          'body': 'OK' // TODO: Return some HTML which will make the candidate feel good.
        });
      })
    });
  } else if (event.httpMethod === 'POST') {
    console.log('POST event = ', event);
    // TODO: Hook this up to spreadsheet.addCandidate once we've figured out how to pass everything correctly.
    callback(null, {
      'isBase64Encoded': false,
      'statusCode': 200,
      'headers': { 'headerName': 'headerValue' },
      'body': JSON.stringify(event)
    });
  }
}

module.exports = {
  run: run
}
