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
  exec(`mkdir /tmp/${candidateRepo} && cd /tmp/${candidateRepo} && git init && git pull https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${templateRepo} && git remote add origin https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${candidateRepo} && git push origin master && cd /tmp && rm -rf ${candidateRepo}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }

    grantCollaboratorAccess();
  })
}

// Step 3 - Grant the user collaborator access to the new repo
function grantCollaboratorAccess() {
  github.repos.addCollaborator({
    owner: org,
    repo: candidateRepo,
    username: candidateGitHubUsername,
    permission: 'push' // Options are 'pull', 'push', 'admin'.
  }).then(res => {
    console.log('success', res);
  }).catch(err => {
    console.error(err);
  });
}

function removeCollaboratorAccess() {
  github.repos.removeCollaborator({
    owner: org,
    repo: candidateRepo,
    username: candidateGitHubUsername
  }).then(res => {
    console.log('success', res);
  }).catch(err => {
    console.error(err);
  });
}

// Start the process!
// TODO: call createRepo to start.
removeCollaboratorAccess();
