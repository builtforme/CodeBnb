# CodeBnb
This repository controls the access to the software engineering assignment. The name is a spin on AirBnb, since the candidates rent a repository from BFM for a short period of time, use it, and then lose access to it.

This is meant to run as an AWS Lambda function once per day. It takes the following actions:

1. Query the data store to identify any individuals whose 72-hour assignment window is starting in the next 24 hours.
2. Fork the base repository into a repository customized for the candidate.
3. Grant the candidate's GitHub account outside collaborator access to the repository.
4. Notify the candidate the access has been granted. (Via email? Via AngelList?)
5. Revoke the outside collaborator access at the end of the 72-hour assignment window.

## Setup
You need to set some environment variables to make this run:

`GITHUB_USER_TOKEN` - An access token from https://github.com/settings/tokens retrieved by an account with sufficient permissions to the GitHub organization containing the template repo.
