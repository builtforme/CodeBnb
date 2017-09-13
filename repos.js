const GitHubApi = require('github');
const Promise = require('bluebird');
const {exec} = require('child_process');

const org = process.env.GITHUB_ORG;

const github = new GitHubApi({
  Promise: require('bluebird'),
  timeout: 5000
});

github.authenticate({
  type: 'token',
  token: process.env.GITHUB_USER_TOKEN
});

function initializeCandidate(params) {
  const templateRepo = params.templateRepo;
  const candidateGitHubUsername = params.candidateGitHubUsername;
  const candidateRepo = `${templateRepo}-${candidateGitHubUsername}`;
  const candidateName = params.candidateName;

  // Step 1 - create the repo
  function createRepo() {
    github.repos.createForOrg({
      name: `${candidateRepo}`,
      org: org,
      description: `Software Engineering Assignment for ${candidateName}`,
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

  // Start by calling createRepo.
  createRepo();
}

function removeCollaboratorAccess(params) {
  return new Promise((resolve, reject) => {
    github.repos.removeCollaborator({
      owner: org,
      repo: `${params.templateRepo}-${params.candidateGitHubUsername}`,
      username: params.candidateGitHubUsername
    }).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

module.exports = {
  initializeCandidate,
  removeCollaboratorAccess
}
