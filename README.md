# CodeBnb
CodeBnb controls distribution of, and access to, software engineering assignments (sometimes called "homework" or "coding questions"). It uses one or more _template_ repositories which are then cloned into a unique repo for each candidate. Different candidates can be given different assignments. This allows you to A/B test assignments, or to have different assignments for different positions. The same candidate can also be given multiple different assignments (if your hiring process involves multiple assignment stages, or if you need a second data point on a borderline candidate). Different assignment windows are supported as well, and access is automatically removed at the end of the window.

The name "CodeBnb" is a play on AirBnb, since the candidates get use of a repository for a short period of time, use it, and then lose access to it.

This is intended to be run as a scheduled task, once per day, under AWS Lambda (or really any other mechanism). It is not idempotent and should not be run more than once per day. It performs the following actions:

1. Creates a unique invitation for candidates to undertake the project starting at their convenience.
2. When a candidate chooses by clicking the invitation link, clones the assignment template repository into a repository specifically for the candidate. The spreadsheet controls which assignment repository template is used. (GitHub does not allow a repository to be forked within the same organization.)
3. Grant the candidate's GitHub account outside collaborator `push` access to the repository. GitHub will automatically notify the candidate who has to accept the invitation.
5. Revoke the outside collaborator access at the end of the assignment window, based on the duration specified in the Google Spreadsheet.
6. Notifies you via email when you should review a candidate's work.
7. Notifies you via email when a candidate's invitation is about to expire.

## Usage
When you have a new candidate, simply go to `$AWS_API_GATEWAY_ENDPOINT`/`<stage>`/addcandidate?authorization=`$ADD_CANDIDATE_AUTHORIZATION_CODE` and fill out the form (which asks for the candidate's name, the assignment you'd like to give them, and the duration of their assignment). You'll be given a URL which you give to the candidate. This URL is valid for 30 days and allows the candidate to specify their GitHub username and start the assignment whenever they would like.

At the end of the assignment window, simply peruse the candidate's repo and judge their work, and proceed with your hiring process accordingly.

All actions taken by CodeBnb are recorded in the Google Spreadsheet, and you don't have to edit the spreadsheet at all.

## Installation and Setup
CodeBnb uses [TerraForm](http://terraform.io) to help manage infrastructure.

1. Create an ACM cert valid for your domain, eg `example.com`. The ACM cert should also support a wildcard for your domain, eg `*.example.com`. (Your Lambda function will be called by an API Gateway located at `https://codebnb.example.com`.)
1. Pick an S3 bucket to use. Set this name in `package.json` under `config` > `s3bucket`.
1. Create the S3 bucket you want to use to as the source for the AWS Lambda function.
  1. `$ npm run createS3bucket`
1. Change to the terraform directory
  1. `$ cd terraform`
1. Install the AWS TerraForm provider.
  1. `$ terraform init`
1. Deploy everything using TerraForm. `package.json` contains a convenience script which (a) bundles everything into a zip file, (b) uploads it to a version folder in the S3 bucket, (c) sets the s3 bucket and version variables in TerraForm, and (d) runs `terraform apply` for you.
  1. `$ npm run deploy` and run the `terraform apply` command instructed. You can manually modify the AWS Lambda environment variables afterwards.

## Manual Infrastructure Setup (not recommended)

### AWS Lambda
1. Run `npm run zip` to generate the file `lambda.zip`.
2. Create an AWS Lambda function, using the CloudWatch Events trigger. Use `cron(0 0 * * ? *)` for midnight UTC every day.
3. Select the "Upload a .ZIP file" as your "Code entry type" and upload `lambda.zip` generated in step 1.
4. Click `Save and test` and troubleshoot, repeating steps 1, 3, and 4 until you see success.

#### Environment Variables

You need to set some environment variables in your AWS Lambda function:

`GITHUB_ORG` - The name of the organization under which software assignments will be created (and in which the template repository lives).

`GITHUB_USER_TOKEN` - An access token from https://github.com/settings/tokens retrieved by an account with sufficient permissions to the GitHub organization containing the template repo. The required permissions are *repo* ("Full control of private repositories") consisting of `repo:status`, `repo_deployment`, `public_repo`, and `repo:invite`, and *delete_repo* (to allow CodeBnb to archive the project repositories to keep the org relatively clean).

`SPREADSHEET_KEY` - The spreadsheet key from the Google Docs URL. See https://www.npmjs.com/package/google-spreadsheet

`GOOGLE_CLIENT_EMAIL` - IAM user. See _Google Sheets Setup_ below.

`GOOGLE_PRIVATE_KEY` - IAM user private key. See _Google Sheets Setup_ below.

`AWS_API_GATEWAY_ENDPOINT` - The endpoint of your AWS API Gateway. Something like `https://<junk>.execute-api.us-east-1.amazonaws.com/<stage>`. See _AWS API Gateway Setup_ below.

`ADD_CANDIDATE_AUTHORIZATION_CODE` - Any secret that needs to be provided in order to add a candidate to the list of permitted candidates.

`EMAIL_FROM` - The email address used as the sender for email-based notifications.

`REVOCATION_NOTIFICATION_RECEPIENT` - Email address to receive notifications when a candidate's access is revoked.

`ARCHIVE_REPO` - The name of a repo in the same `GITHUB_ORG` which will be used to store archives of projects, allowing candidate-specific repos to be deleted after a period of time. Each candidate repo will be copied into a folder named `$ARCHIVE_REPO/$TEMPLATE_REPO/$TEMPLATE_REPO-$CANDIDATE_NAME` within the ARCHIVE REPO.

If running locally, you can simply store these keys in a `.env` file and they will automatically be loaded into your environment.

### CloudWatch Events
You need to configure three cloudwatch events to automate some portions of CodeBnb:
1. `ScanForExpiredWindows` - schedule expression `rate(30 minutes)` - Input: Constant: `{"action": "scanForExpiredWindows"}`
2. `ScanForExpiringInvitations` - schedule expression `cron(0 0 * * ? *)` - Input: Constant: `{"action": "scanForExpiringInvitations"}`
3. `ScanForReposToArchive` - schedule expression `rate(1 day)` - Input: Constant: `{"action": "archiveRepos"}`

### GitHub Repos
Assign the "project" [topic](https://help.github.com/articles/about-topics/) to any repo you wish to use as a template repo. When generating a candidate URL, CodeBnb will allow you to select from any _project_ topic repos within your GitHub org.

### AWS API Gateway Setup
Configure a new API Gateway with two resources:

1. `/addcandidate`
2. `/assignment`

Add a `GET` method on each. Configure each method as a `LAMBDA_PROXY` to your AWS Lambda function.

3. Add a `POST` method on `/assignment`, also configured as a Lambda Proxy.
4. Click Actions > Deploy API to deploy the API. Create a new stage to deploy to (this stage name will be visible in your URL).

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
archived | CodeBnb will record a timestamp of when the repo is archived. (Leave this column blank when adding new candidates). Archiving a repo consists of copying it as a subtree within a master project archive repo.

Note: Column names are case- and whitespace-insensitive. For example, "Candidate Name" and "candidatename" are both acceptable.

### Running Unit Tests

In order to run the unit test suite, run the command from within the root directory.
```
npm test
```

### Troubleshooting
#### Archive
If you see the error
```
fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
Working tree has modifications.  Cannot add.
```
that likely means there are no commits in your archive repo. Make some initial commit then try again.

#### API Gateway Internal Server Error
If accessing via a web browser you get an internal server error but when you use the AWS Console to test the API Gateway integration and it works, you may need to re-deploy the API using the AWS Console.
