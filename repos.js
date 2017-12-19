const GitHubApi = require('github');
const Promise = require('bluebird');
const {exec} = require('child_process');

const org = process.env.GITHUB_ORG;

const github = new GitHubApi({
  Promise: Promise,
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
    return `https://github.com/${org}/${candidateRepo}`;
  })
  .catch((err) => {
    console.log('Caught error in repos ', err);
  });
}

function archiveRepo(params) {
  const templateRepo = params.templateRepo;
  const candidateGitHubUsername = params.candidateGitHubUsername;
  const archiveRepo = process.env.ARCHIVE_REPO;
  const candidateRepo = `${templateRepo}-${candidateGitHubUsername}`;
  const candidateName = params.candidateName;
  const randomSuffix = Math.floor(Math.random() * 100000); // To prevent conflicts with existing directory names

  function copyCandidateRepoToArchiveRepo() {
    return new Promise((resolve, reject) => {
      console.log('copyCandidateRepoToArchiveRepo called. Proceeding to do some git magic...');
      exec(`cd /tmp && export HOME=/tmp && git config --global user.email "CodeBnb@{$org}" && git config --global user.name "CodeBnb" && git clone https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${archiveRepo} ${candidateRepo}-${randomSuffix} && cd ${candidateRepo}-${randomSuffix} && git fetch && git pull && git subtree add --prefix=${templateRepo}/${candidateRepo} https://${process.env.GITHUB_USER_TOKEN}@github.com/${org}/${candidateRepo} master && git push origin master && cd /tmp && rm -rf ${candidateRepo}-${randomSuffix}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          reject(err);
        }
        console.log('Fancy git command successful.')
        resolve();
      });
    });
  }

  // Step 3 - Grant the user collaborator access to the new repo
  function deleteCandidateRepo() {
    console.log('deleteCandidateRepo called');
    console.log(`Will be deleting owner ${org}, repo ${candidateRepo}`);
    return github.repos.delete({
      owner: org,
      repo: candidateRepo
    })
    .then(()=> {console.log('Delete candidate repo success')})
    .catch((err)=> {console.log('Delete candidate repo error ', err);});
  }

  return copyCandidateRepoToArchiveRepo()
  .then(deleteCandidateRepo)
  .then(() => {
    console.log('archive repo completed successfully');
    return `https://github.com/${org}/${candidateRepo}`;
  })
  .catch((err) => {
    console.log('Caught error in archive repo ', err);
    return Promise.reject(err);
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

function getProjectRepos() {
  return new Promise((resolve, reject) => {
    github.search.repos({
      q: `user:${process.env.GITHUB_ORG} topic:project`,
      sort: 'updated',
      order: 'desc'
    }, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (result.data.total_count === 0) {
        return reject(new Error('No project repositories found.'));
      }
      resolve(result.data.items.map((item) => {
        return item.name;
      }));
    })
  });
}

module.exports = {
  archiveRepo,
  initializeCandidate,
  removeCollaboratorAccess,
  getProjectRepos,
}
