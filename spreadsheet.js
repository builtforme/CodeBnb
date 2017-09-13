const gs = require('google-spreadsheet');
const _ = require('underscore');
const moment = require('moment');
const repos = require('./repos');

function readSpreadsheet() {
  const doc = new gs(process.env.SPREADSHEET_KEY);
  doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') // Do magic to replace \n with actual newlines
  }, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    doc.getInfo((err, info) => {
      if (err) {
        console.error('Error getting info:', err);
        return;
      }
      const sheet = info.worksheets[0];
      getRowsFromSheet(sheet);
    });
  });
}

function getRowsFromSheet(sheet) {
  // Get rows from the sheet. We order by start and reverse the returned rows
  // so that we get the most recent candidates. Old candidates who completed
  // their assignment long ago should fall off the returned records. This will
  // break if there are ever more than ${limit} candidates scheduled in the future.
  sheet.getRows({
    offset: 0,
    limit: 50,
    orderby: 'start',
    reverse: true
  }, (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    _.each(rows, (candidate) => {
      // If the candidate's start date is within the next 24 hours we need to enable the software engineering assignment.
      // If the candidate's window ends within the next 24 hours we need to revoke access.
      const parsedStart = moment(candidate.start);
      const today = moment();
      const tomorrow = moment().add(1, 'day');
      const parsedEnd = moment(candidate.start).add(candidate.window, 'hours');
      if (parsedStart.isAfter(today) && parsedStart.isBefore(tomorrow)) {
        console.log(`Starting assignment for ${candidate.candidatename}, officially starting at ${candidate.start}`);
        repos.initializeCandidate({
          templateRepo: candidate.assignment,
          candidateGitHubUsername: candidate.github,
          candidateName: candidate.candidatename
        });
        candidate.assigned = today.toString();
        candidate.save();
      } else if (parsedEnd.isAfter(moment()) && parsedEnd.isBefore(moment().add(1, 'day'))) {
        console.log(`Ending assignment for ${candidate.candidatename}, officially started at ${candidate.start} with a ${candidate.window}-hour window.`);
        repos.removeCollaboratorAccess({
          templateRepo: candidate.assignment,
          candidateGitHubUsername: candidate.github
        }).then(() => {
          candidate.revoked = today.toString();
          candidate.save();
        });
      }
    });
  });
}

module.exports = {
  readSpreadsheet,
}
