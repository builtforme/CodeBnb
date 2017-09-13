# CodeBnb
This repository controls the access to the software engineering assignment. The name is a spin on AirBnb, since the candidates rent a repository from BFM for a short period of time, use it, and then lose access to it.

This is intended to be run as a scheduled task, once per day, under AWS Lambda (or really any other mechanism). It is not idempotent and should not be run more than once per day. It performs the following actions:

1. Query the data store to identify any individuals whose 72-hour assignment window is starting in the next 24 hours.
2. Fork the base repository into a repository customized for the candidate.
3. Grant the candidate's GitHub account outside collaborator access to the repository. GitHub will automatically email the candidate.
5. Revoke the outside collaborator access at the end of the 72-hour assignment window.

This reads data from a Google Drive Spreadsheet which controls the start date and assignment window. The spreadsheet also controls the GitHub repo name which will be used as a template for the assignment.

TODO: Describe the columns in the spreadsheet.

## Setup
You need to set some environment variables to make this run:

`GITHUB_ORG` - The name of the organization under which software assignments will be created (and in which the template repository lives).
`GITHUB_USER_TOKEN` - An access token from https://github.com/settings/tokens retrieved by an account with sufficient permissions to the GitHub organization containing the template repo.

`SPREADSHEET_KEY` - The spreadsheet key from the Google Docs URL. See https://www.npmjs.com/package/google-spreadsheet

`GOOGLE_CLIENT_EMAIL` - IAM user. See _Google Sheets Setup_ below.
`GOOGLE_PRIVATE_KEY` - IAM user private key. See _Google Sheets Setup_ below.

### Google Sheets Setup
Follow instructions at https://www.npmjs.com/package/google-spreadsheet#service-account-recommended-method. You'll need to go to https://console.cloud.google.com and create a project, then enable the Sheets API. Then under Credentials > Create credentials > Service account key. You'll be given a JSON file to download and among a bunch of other stuff it will contain your client email and private key.

You may need to go into Google Sheets and grant access to the service account email address.

### AWS Lambda Cron
