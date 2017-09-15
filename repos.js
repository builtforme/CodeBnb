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
    console.log('createRepo called');
    return github.repos.createForOrg({
      name: `${candidateRepo}`,
      org: org,
      description: `Software Engineering Assignment for ${candidateName}`,
      private: true
    });
  }

  // Step 2 - Clone the template repo into the one we just created
  // Based on https://github.com/blog/1270-easier-builds-and-deployments-using-git-over-https-and-oauth
  function cloneTemplateRepo() {
    return new Promise((resolve, reject) => {
      console.log('cloneTemplateRepo called');
      exec(`mkdir /tmp/${candidateRepo} && cd /tmp/${candidateRepo} && git init && git pull https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${templateRepo} && git remote add origin https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${candidateRepo} && git push origin master && cd /tmp && rm -rf ${candidateRepo}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          reject(err);
        }
        resolve();
      });
    });
  }

  // Step 3 - Grant the user collaborator access to the new repo
  function grantCollaboratorAccess() {
    console.log('addCollaborator called');
    return github.repos.addCollaborator({
      owner: org,
      repo: candidateRepo,
      username: candidateGitHubUsername,
      permission: 'push' // Options are 'pull', 'push', 'admin'.
    })
    .then(()=> {console.log('Add collaborator success')})
    .catch((err)=> {console.log('Add collaborator error ', err);});
  }

  return createRepo()
  .then(cloneTemplateRepo)
  .then(grantCollaboratorAccess)
  .then(() => {
    console.log('repos completed successfully');
    return `https://github.com/${process.env.GITHUB_ORG}/${candidateRepo}`;
  })
  .catch((err) => {
    console.log('Caught error in repos ', err);
  });
}

function removeCollaboratorAccess(params) {
  return new Promise((resolve, reject) => {
    console.log('Calling remove collaborator. Params = ', params);
    github.repos.removeCollaborator({
      owner: org,
      repo: `${params.templateRepo}-${params.candidateGitHubUsername}`,
      username: params.candidateGitHubUsername
    }).then(res => {
      resolve(res);
    }).catch(err => {
      const s = JSON.stringify(params);
      console.error(`Error removing collaborator access. Message: ${err.message}; params: ${s}`);
      reject(err);
    });
  });
}

module.exports = {
  initializeCandidate,
  removeCollaboratorAccess
}
