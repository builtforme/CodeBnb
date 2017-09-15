const spreadsheet = require('./spreadsheet');
const fs = require('fs');

function run(event, context, callback) {
  console.log('Event = ', JSON.stringify(event));
  if (event.httpMethod === 'GET'
    && event.queryStringParameters.authCode) {
    // If a GitHub username was provided, then we start the assignment.
    if (event.queryStringParameters.githubUsername) {
      require('lambda-git')().then(() => {
        console.log('git should now be installed and available for use');
        spreadsheet.startAssignment(event.queryStringParameters.authCode, event.queryStringParameters.githubUsername)
        .then(() => {
          console.log('Assignment started successfully');
          callback(null, {
            'isBase64Encoded': false,
            'statusCode': 200,
            'headers': { 'headerName': 'headerValue' },
            'body': fs.readFileSync('html/success.html', {encoding: 'utf8'})
          });
        })
        .catch((err) => {
          console.log('caught error ', err);
          callback(null, {
            'isBase64Encoded': false,
            'statusCode': 400,
            headers: {},
            'body': err.message
          });
        });
      });
    } else {
      // If an authCode was provided but no GitHub username, then we need to return
      // an HTML page which prompts the candidate to enter their GitHub username.
      // We don't validate the authCode in this path since it doesn't matter.
      console.log('No GitHub username provided; returning HTML to ask for it.');
      callback(null, {
        'isBase64Encoded': false,
        'statusCode': 200,
        'headers': { 'content-type': 'text/html' },
        'body': fs.readFileSync('html/githubUsernameForm.html', {encoding: 'utf8'})
      });
    }
  } else if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    if (body.assignment && body.candidateName && body.duration) {
      spreadsheet.addCandidate(body.candidateName, body.assignment, body.duration)
      .then((row) => {
        const html = `<html><body>Provide this URL to your candidate: <B>${process.env.AWS_API_GATEWAY_ENDPOINT}/assignment?authCode=${row.authcode}</B></body></html>`;
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 200,
          'headers': { 'Content-Type': 'text/html' },
          'body': html
        });
      });
    } else {
      callback(null, {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': {},
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
