// Needs to be first to load in environment variables
// from .env file
require('dotenv').config();
const spreadsheet = require('./spreadsheet');
const fs = require('fs');
const str = require('underscore.string');
const email = require('./email');

function run(event, context, callback) {
  console.log('Event = ', JSON.stringify(event));
  if (event.httpMethod === 'GET'
    && event.resource === '/assignment') {
    // If an authcode and GitHub username was provided, then we start the assignment.
    if (event.queryStringParameters.authCode && event.queryStringParameters.githubUsername) {
      require('lambda-git')().then(() => {
        console.log('git should now be installed and available for use');
        spreadsheet.startAssignment(event.queryStringParameters.authCode, event.queryStringParameters.githubUsername)
        .then((githubRepoUrl) => {
          console.log('Assignment started successfully');
          callback(null, {
            'isBase64Encoded': false,
            'statusCode': 200,
            'headers': { 'content-type': 'text/html' },
            'body': str.sprintf(fs.readFileSync('html/success.html', {encoding: 'utf8'}), githubRepoUrl, githubRepoUrl)
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
      .then(() => {
        console.log('scan for expired windows successful.');
        callback(null);
      })
      .catch((err) => {
        console.log('Scan for expired windows failed. Err = ', err);
        callback(err);
      });
    }  else if (event.action === 'scanForExpiringInvitations'){
      console.log('Scanning for expiring invitations...');
      spreadsheet.scanForExpiringInvitations()
      .then(() => {
        console.log('scan for expiring invitations successful.');
        callback(null);
      })
      .catch((err) => {
        console.log('Scan for expiring invitations failed. Err = ', err);
        callback(err);
      });
    } else if (event.action === 'sendTestNotification') {
      email.sendRevocationNotification('TEST USER')
      .then(() => {
        callback(null, {
          'isBase64Encoded': false,
          'statusCode': 200,
          'headers': { 'Content-Type': 'text/html' },
          'body': `Email sent successfully to ${process.env.REVOCATION_NOTIFICATION_RECEPIENT}`
        });
      })
      .catch(callback);
    } else if (event.action === 'archiveRepos'){
      console.log('Scanning for repos to archive...');
      spreadsheet.archiveRepos()
      .then(() => {
        console.log('scan for repos to archive successful.');
        callback(null);
      })
      .catch((err) => {
        console.log('Scan for repos to archive failed. Err = ', err);
        callback(err);
      });
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
