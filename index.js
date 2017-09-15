const spreadsheet = require('./spreadsheet');

function run(event, context, callback) {
  if (event.httpMethod === 'GET'
    && event.queryStringParameters.githubUsername
    && event.queryStringParameters.authCode) {
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
      .catch((err) => {
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 400,
          headers: {},
          'body': err.message
        });
      });
    });
  } else if (event.httpMethod === 'POST') {
    const body = event.body; //JSON.parse(event.body);
    if (body.assignment && body.candidateName && body.duration) {
      repos.addCandidate(body.candidateName, body.assignment, body.duration)
      .then((row) => {
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 200,
          'headers': { 'headerName': 'headerValue' },
          'body': 'Auth Code = ' + row.authcode // TODO: Return nice HTML to copy and paste a link to candidate.
        });
      });
    } else {
      callback(null, {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': { 'headerName': 'headerValue' },
        'body': JSON.stringify(event)
      });
    }
  } else {
    console.log('Completely unexpected event: ', event);
  }
}

module.exports = {
  handler: run
}
