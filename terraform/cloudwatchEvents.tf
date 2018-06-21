## CloudWatch Events to trigger the Lambda function to automate some CodeBnb functionality.
resource "aws_cloudwatch_event_rule" "scan_for_expired_invitations_every_day" {
    name = "scan_for_expired_invitations_every_day"
    description = "Scans for expired invitations every day"
    schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_rule" "archive_repos" {
    name = "archive_repos"
    description = "Scans for repos to archive every day"
    schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_rule" "scan_for_expired_windows_every_30_minutes" {
    name = "scan_for_expired_windows_every_30_minutes"
    description = "Revoke GitHub permissions when window has expired every 30 minutes"
    schedule_expression = "rate(30 minutes)"
}

resource "aws_lambda_permission" "allow_scan_for_expired_invitations_to_call_code_bnb" {
    statement_id = "AllowExecutionFromCloudWatchInvitations"
    action = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.code_bnb.function_name}"
    principal = "events.amazonaws.com"
    source_arn = "${aws_cloudwatch_event_rule.scan_for_expired_invitations_every_day.arn}"
}

resource "aws_lambda_permission" "allow_scan_for_expired_windows_every_30_minutes_to_call_code_bnb" {
    statement_id = "AllowExecutionFromCloudWatchExpredWindowsr"
    action = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.code_bnb.function_name}"
    principal = "events.amazonaws.com"
    source_arn = "${aws_cloudwatch_event_rule.scan_for_expired_windows_every_30_minutes.arn}"
}

resource "aws_lambda_permission" "allow_archive_repos_to_call_code_bnb" {
    statement_id = "AllowExecutionFromCloudWatchArchiveRepos"
    action = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.code_bnb.function_name}"
    principal = "events.amazonaws.com"
    source_arn = "${aws_cloudwatch_event_rule.archive_repos.arn}"
}

resource "aws_cloudwatch_event_target" "scan_for_expired_windows" {
    rule = "${aws_cloudwatch_event_rule.scan_for_expired_windows_every_30_minutes.name}"
    target_id = "scan_for_expired_windows"
    input = "{\"action\": \"scanForExpiredWindows\"}"
    arn = "${aws_lambda_function.code_bnb.arn}"
}

resource "aws_cloudwatch_event_target" "scan_for_expired_invitations" {
    rule = "${aws_cloudwatch_event_rule.scan_for_expired_invitations_every_day.name}"
    target_id = "scan_for_expired_invitations"
    input = "{\"action\": \"scanForExpiringInvitations\"}"
    arn = "${aws_lambda_function.code_bnb.arn}"
}

resource "aws_cloudwatch_event_target" "archive_repos" {
    rule = "${aws_cloudwatch_event_rule.archive_repos.name}"
    target_id = "archive_repos"
    input = "{\"action\": \"archiveRepos\"}"
    arn = "${aws_lambda_function.code_bnb.arn}"
}
