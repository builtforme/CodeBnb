const gs = require('google-spreadsheet');
const _ = require('underscore');
const moment = require('moment');
const repos = require('./repos');
const Promise = require('bluebird');

function getWorksheet() {
  return new Promise((resolve, reject) => {
  const doc = new gs(process.env.SPREADSHEET_KEY);
    doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') // Do magic to replace \n with actual newlines
    }, (err) => {
      if (err) {
        return reject(err);
      }
      doc.getInfo((err, info) => {
        if (err) {
          return reject(err);
        }
        resolve(info.worksheets[0]);
      });
    });
  });
}

function addCandidate(candidatename, assignment, windowDuration) {
  return addRow({
    candidatename,
    assignment,
    'window': windowDuration,
    authcode: Math.floor(Math.random() * 10000000000),
    created: moment().toString()
  })
}

function addRow(row) {
  return getWorksheet()
  .then((sheet) => {
    return new Promise((resolve, reject) => {
      sheet.addRow(row, (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      })
    });
  });
}

function readSpreadsheet() {
  getWorksheet()
  .then(getRowsFromSheet);
}

function startAssignment(authcode, githubUsername) {
  return getWorksheet()
  .then((sheet) => {
    return new Promise((resolve, reject) => {
      // Get rows from the sheet. We order by assigned and reverse the returned rows
      // so that we get candidates who have not been assigned yet.
      sheet.getRows({
        offset: 0,
        limit: 50,
        orderby: 'assigned',
        reverse: true
      }, (err, rows) => {
        if (err) {
          return reject(err);
        }
        const candidate = _.find(rows, (row) => {
          return row.authcode === authcode;
        });

        if (!candidate) {
          console.log(`Did not find a candidate matching authcode ${authcode}`);
          return reject(new Error('Invalid Authentication Code'));
        }

        if (candidate.assigned) {
          console.log(`Attempt to re-use auth code ${authcode}`);
          return reject(new Error('Used Authentication Code'));
        }

        if (moment(candidate.created).isBefore(moment().subtract(30, 'days'))) {
          console.log(`Attempt to use expired auth code ${authcode}`);
          return reject(new Error('Expired Authentication Code'));
        }

        // TODO: Do the repos thing.
        console.log(candidate);
      });
    });
  });
}

// function getRowsFromSheet(sheet) {
//
//
//     _.each(rows, (candidate) => {
//       // If the candidate's start date is today we need to enable the software engineering assignment.
//       // If the candidate's window ends today we need to revoke access.
//       // All this works because we expect this code to be run only once per day.
//       const parsedStart = moment(candidate.start);
//       const today = moment();
//       const parsedEnd = moment(candidate.start).add(candidate.window, 'hours');
//       console.log(`Parsed Start Date ${parsedStart}; today is ${today}; parsed end date is ${parsedEnd}`);
//       if (parsedStart.isSame(today, 'day')) {
//         console.log(`Starting assignment for ${candidate.candidatename}, officially starting at ${candidate.start}`);
//         repos.initializeCandidate({
//           templateRepo: candidate.assignment,
//           candidateGitHubUsername: candidate.github,
//           candidateName: candidate.candidatename
//         });
//         candidate.assigned = today.toString();
//         candidate.save();
//       } else if (parsedEnd.isSame(today, 'day')) {
//         console.log(`Ending assignment for ${candidate.candidatename}, officially started at ${candidate.start} with a ${candidate.window}-hour window.`);
//         repos.removeCollaboratorAccess({
//           templateRepo: candidate.assignment,
//           candidateGitHubUsername: candidate.github
//         }).then(() => {
//           candidate.revoked = today.toString();
//           candidate.save();
//         });
//       }
//     });
//   });
// }

// module.exports = {
//   readSpreadsheet,
// }

startAssignment('3009270414', 'Furchin');

//addCandidate('Michal Bryc', 'battleship', 72);
