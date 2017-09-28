const gs = require('google-spreadsheet');
const _ = require('underscore');
_.str = require('underscore.string');
const moment = require('moment');
const repos = require('./repos');
const Promise = require('bluebird');
const email = require('./email');

const INVITATION_VALID_FOR_DAYS = 30;

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
    created: moment().format()
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

        if (moment(candidate.created).isBefore(moment().subtract(INVITATION_VALID_FOR_DAYS, 'days'))) {
          console.log(`Attempt to use expired auth code ${authcode}`);
          return reject(new Error('Expired Authentication Code'));
        }

        repos.initializeCandidate({
          templateRepo: candidate.assignment,
          candidateName: candidate.candidatename,
          candidateGitHubUsername: githubUsername
        }).then((repo) => {
          candidate.gitHub = githubUsername;
          candidate.assigned = moment().format();
          candidate.save();
          resolve(repo);
        });
      });
    });
  })
  .catch((err) => {
    console.log('Caught error in spreadsheet startAssignment: ', err);
  });
}

function scanForExpiringInvitations() {
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

        expiringInvitations = _.filter(rows, (row) => {
          console.log(`Assigned: ${row.assigned}`);
          console.log(`now: ${moment()}`);
          return !row.revoked && moment().isSame(moment(row.created).add(INVITATION_VALID_FOR_DAYS, 'days'), 'day');
        });

        console.log(`Found ${expiringInvitations.length} invitations expiring in the next day.`);

        if (expiringInvitations.length > 0) {
          email.sendInvitationExpiringNotification(_.str.join(', ', _.pluck(expiringInvitations, 'candidatename')))
          .then(resolve)
          .catch(reject);
        } else {
          resolve();
        }
      });
    });
  });
}

function scanForExpiredWindows() {
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

        expiredRows = _.filter(rows, (row) => {
          return !row.revoked && moment().isAfter(moment(row.assigned).add(row.window, 'hours'));
        });

        console.log(`Found ${expiredRows.length} expired rows.`);

        const revocations = [];

        _.each(expiredRows, (row) => {
          row.revoked = moment().format();
          row.save();
          revocations.push(new Promise((resolve, reject) => {
            // Google has ugly cruft.
            delete row._xml;

            console.log('Removing access for expired row ', row);

            return repos.removeCollaboratorAccess({
              candidateGitHubUsername: row.github,
              templateRepo: row.assignment
            })
            .then(email.sendRevocationNotification(row.candidatename))
            .then(resolve)
            .catch(reject);
          }));
        });

        console.log('Waiting for ' + revocations.length + ' revocations...');
        Promise.all(revocations)
        .then(resolve)
        .catch(reject);
      });
    });
  });
}

module.exports = {
  startAssignment,
  addCandidate,
  scanForExpiredWindows,
  scanForExpiringInvitations
}

//scanForExpiredWindows();

//startAssignment('3009270414', 'Furchin');

//addCandidate('Michal Bryc', 'battleship', 72);
