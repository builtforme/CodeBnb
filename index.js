const spreadsheet = require('./spreadsheet');
const fs = require('fs');

function run(event, context, callback) {
  console.log('Event = ', JSON.stringify(event));
  if (event.httpMethod === 'GET'
    && event.resource === '/assignment') {
    // If an authcode and GitHub username was provided, then we start the assignment.
    if (event.queryStringParameters.authCode && event.queryStringParameters.githubUsername) {
      require('lambda-git')().then(() => {
        console.log('git should now be installed and available for use');
        spreadsheet.startAssignment(event.queryStringParameters.authCode, event.queryStringParameters.githubUsername)
        .then(() => {
          console.log('Assignment started successfully');
          callback(null, {
            'isBase64Encoded': false,
            'statusCode': 200,
            'headers': { 'content-type': 'text/html' },
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
      // If no GitHub username, then we need to return
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
  } else if (event.httpMethod === 'GET'
    && event.resource === '/addcandidate'
    && event.queryStringParameters
    && event.queryStringParameters.authorization === process.env.ADD_CANDIDATE_AUTHORIZATION_CODE) {
    // Are all the required parameters present?
    if (event.queryStringParameters.assignment
      && event.queryStringParameters.candidateName
      && event.queryStringParameters.duration) {
        spreadsheet.addCandidate(event.queryStringParameters.candidateName, event.queryStringParameters.assignment, event.queryStringParameters.duration)
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
        // Return the HTML to collect the required parameters
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 200,
          'headers': { 'Content-Type': 'text/html' },
          'body': fs.readFileSync('html/candidateForm.html', {encoding: 'utf8'})
        });
      }
    } else if (event.action === 'scanForExpiredWindows'){
      console.log('Scanning for expired windows...');
      spreadsheet.scanForExpiredWindows()
      .then(callback);
    } else {
      console.log('Completely unexpected event: ', event);
      callback(null, {
        'isBase64Encoded': false,
        'statusCode': 404,
        'headers': { 'Content-Type': 'text/html' },
        'body': ''
      });
  }
}

module.exports = {
  handler: run
}
