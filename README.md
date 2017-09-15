# CodeBnb
CodeBnb controls distribution of, and access to, software engineering assignments (sometimes called "homework" or "coding questions"). It uses one or more _template_ repositories which are then cloned into a unique repo for each candidate. Different candidates can be given different assignments. This allows you to A/B test assignments, or to have different assignments for different positions. The same candidate can also be given multiple different assignments (if your hiring process involves multiple assignment stages, or if you need a second data point on a borderline candidate). Different assignment windows are supported as well, and access is automatically removed at the end of the window.

The name "CodeBnb" is a play on AirBnb, since the candidates get use of a repository for a short period of time, use it, and then lose access to it.

This is intended to be run as a scheduled task, once per day, under AWS Lambda (or really any other mechanism). It is not idempotent and should not be run more than once per day. It performs the following actions:

1. Query the Google Spreadsheet to identify any individuals whose assignment window is starting in the next 24 hours.
2. Clones the assignment template repository into a repository specifically for the candidate. The spreadsheet controls which assignment repository template is used. (GitHub does not allow a repository to be forked within the same organization.)
3. Grant the candidate's GitHub account outside collaborator `push` access to the repository. GitHub will automatically notify the candidate who has to accept the invitation.
5. Revoke the outside collaborator access at the end of the assignment window, based on the duration specified in the Google Spreadsheet.

## Usage
When you have a new candidate, simply go to `$AWS_API_GATEWAY_ENDPOINT`/`<stage>`/addcandidate?authorization=`$ADD_CANDIDATE_AUTHORIZATION_CODE` and fill out the form (which asks for the candidate's name, the assignment you'd like to give them, and the duration of their assignment). You'll be given a URL which you give to the candidate. This URL is valid for 30 days and allows the candidate to specify their GitHub username and start the assignment whenever they would like.

At the end of the assignment window, simply peruse the candidate's repo and judge their work, and proceed with your hiring process accordingly.

All actions taken by CodeBnb are recorded in the Google Spreadsheet, and you don't have to edit the spreadsheet at all.

## Setup

### AWS Lambda
1. Run `npm run zip` to generate the file `lambda.zip`.
2. Create an AWS Lambda function, using the CloudWatch Events trigger. Use `cron(0 0 * * ? *)` for midnight UTC every day.
3. Select the "Upload a .ZIP file" as your "Code entry type" and upload `lambda.zip` generated in step 1.
4. Click `Save and test` and troubleshoot, repeating steps 1, 3, and 4 until you see success.

You need to set some environment variables in your AWS Lambda function:

`GITHUB_ORG` - The name of the organization under which software assignments will be created (and in which the template repository lives).

`GITHUB_USER_TOKEN` - An access token from https://github.com/settings/tokens retrieved by an account with sufficient permissions to the GitHub organization containing the template repo.

`SPREADSHEET_KEY` - The spreadsheet key from the Google Docs URL. See https://www.npmjs.com/package/google-spreadsheet

`GOOGLE_CLIENT_EMAIL` - IAM user. See _Google Sheets Setup_ below.

`GOOGLE_PRIVATE_KEY` - IAM user private key. See _Google Sheets Setup_ below.

`AWS_API_GATEWAY_ENDPOINT` - The endpoint of your AWS API Gateway. Something like `https://<junk>.execute-api.us-east-1.amazonaws.com/<stage>`. See _AWS API Gateway Setup_ below.

`ADD_CANDIDATE_AUTHORIZATION_CODE` - Any secret that needs to be provided in order to add a candidate to the list of permitted candidates.

### AWS API Gateway Setup
Configure a new API Gateway with two resources:

1. `/addcandidate`
2. `/assignment`

Add a `GET` method on each. Configure each method as a `LAMBDA_PROXY` to your AWS Lambda function.

### Google Sheets Setup
Follow instructions at https://www.npmjs.com/package/google-spreadsheet#service-account-recommended-method. You'll need to go to https://console.cloud.google.com and create a project, then enable the Sheets API. Then under Credentials > Create credentials > Service account key. You'll be given a JSON file to download and among a bunch of other stuff it will contain your client email and private key.

You will need to go into Google Sheets and grant read/write access to the service account email address on the spreadsheet.

CodeBnb expects a Google Spreadsheet with the following columns:

Column | Description
------------|------------
Candidate Name | The candidate's real name, which will be used in the GitHub repo description to help identify the candidate.
Assignment |  The name of the GitHub repository that will be cloned into a candidate-specific repository in which the candidate will do their assignment. The candidate-specific repository will be named `<assignment>-<github>`.
Window | The assignment duration, in hours. This is how long candidates will have access to their repos. This value should be a multiple of 24 (the CodeBnb run frequency).
Auth Code | This column records the auth code which prevents candidates from merely granting themselves access until they've been whitelisted.
Created | This column records the date each row was inserted by CodeBnb.
GitHub | The candidate's GitHub account username, which is the GitHub account which will be granted `push` rights to the repository.
assigned | CodeBnb will record a timestamp of when access is granted to the repo. (Leave this column blank when adding new candidates).
revoked | CodeBnb will record a timestamp of when access is revoked from the repo. (Leave this column blank when adding new candidates).

Note: Column names are case- and whitespace-insensitive. For example, "Candidate Name" and "candidatename" are both acceptable.
