const GitHubApi = require('github');
const {exec} = require('child_process');

const org = 'builtforme';
const templateRepo = 'battleship';

// TODO: These should be read from a data store
const candidateGitHubUsername = 'Furchin';
// TODO: Add start, end dates.

const candidateRepo = `${templateRepo}-${candidateGitHubUsername}`;


const github = new GitHubApi({
  Promise: require('bluebird'),
  timeout: 5000
});

github.authenticate({
  // type: "oauth",
  // //token: process.env.GITHUB_TOKEN
  // key: process.env.GITHUB_KEY,
  // secret: process.env.GITHUB_SECRET
  type: "token",
  token: process.env.GITHUB_USER_TOKEN
});

// Step 1 - create the repo
function createRepo() {
  github.repos.createForOrg({
    name: `${candidateRepo}`,
    org: org,
    description: `Software Engineering Assignment for ${candidateGitHubUsername}`,
    private: true
  }).then(function (res) {
    cloneTemplateRepo();
  }).catch(function(err) {
    console.log('error = ', err);
  });
}

// Step 2 - Clone the template repo into the one we just created
// Based on https://github.com/blog/1270-easier-builds-and-deployments-using-git-over-https-and-oauth
function cloneTemplateRepo() {
  exec(`mkdir ${candidateRepo} && cd ${candidateRepo} && git init && git pull https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${templateRepo} && git remote add origin https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${candidateRepo} && git push origin master`, (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
    // TODO: Push to cloned repo

    // TODO: Move to step 3.
  })
}

// Step 3 - Grant the user collaborator access to the new repo

// Start the process!
// TODO: call createRepo to start.
cloneTemplateRepo();
