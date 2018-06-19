# AWS S3 bucket containing the Lambda code
resource "aws_s3_bucket" "lambda" {
  bucket = "${var.s3_bucket}"
  acl    = "private"

  tags {
    Name = "${var.lambda_function_name}"
    Environment = "production"
  }
}

provider "aws" {
  region = "${var.aws_region}"
}

# TODO: Verify if we can replace references to ${data.aws_region.current.name} with ${var.aws_region}
data "aws_region" "current" {}

# Set up the AWS caller identity, which allows us to reference the AWS account ID by using
# ${data.aws_caller_identity.current.account_id}
data "aws_caller_identity" "current" {}


resource "aws_lambda_function" "code_bnb" {
  function_name = "${var.lambda_function_name}"

  # The bucket name as created earlier with "aws s3api create-bucket"
  s3_bucket = "${aws_s3_bucket.lambda.bucket}"
  s3_key    = "v${var.app_version}/lambda.zip"

  # "index" is the filename within the zip file (index.js) and "run"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.run"
  runtime = "nodejs8.10"

  role = "${aws_iam_role.lambda_exec.arn}"

  environment {
    variables = {
      GITHUB_ORG = "${var.github_org}"
      GITHUB_USER_TOKEN = "${var.github_user_token}"
      SPREADSHEET_KEY = "${var.spreadsheet_key}"
      GOOGLE_CLIENT_EMAIL = "${var.google_client_email}"
      GOOGLE_PRIVATE_KEY = "${var.google_private_key}"
      AWS_API_GATEWAY_ENDPOINT = "${var.aws_api_gateway_endpoint}"
      ADD_CANDIDATE_AUTHORIZATION_CODE = "${var.add_candidate_authorization_code}"
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "lambda_exec" {
  name = "${var.lambda_function_name}Lambda"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_api_gateway_rest_api" "code_bnb" {
  name        = "${var.lambda_function_name}ApiGateway"
  description = "API Gateway for ${var.lambda_function_name} Lambda"
}

resource "aws_api_gateway_resource" "add_candidate" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  parent_id   = "${aws_api_gateway_rest_api.code_bnb.root_resource_id}"
  path_part   = "addCandidate"
}

resource "aws_api_gateway_method" "add_candidate" {
  rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id   = "${aws_api_gateway_resource.add_candidate.id}"
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_resource" "get_assignment" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  parent_id   = "${aws_api_gateway_rest_api.code_bnb.root_resource_id}"
  path_part   = "assignment"
}

resource "aws_api_gateway_method" "get_assignment" {
  rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id   = "${aws_api_gateway_resource.get_assignment.id}"
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_resource" "post_assignment" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  parent_id   = "${aws_api_gateway_rest_api.code_bnb.root_resource_id}"
  path_part   = "assignment"
}

resource "aws_api_gateway_method" "post_assignment" {
  rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id   = "${aws_api_gateway_resource.post_assignment.id}"
  http_method   = "POST"
  authorization = "NONE"
}

data "aws_acm_certificate" "acm_cert" {
  domain   = "${var.domain}"
  statuses = ["ISSUED"]
}

resource "aws_api_gateway_domain_name" "api_gw_domain" {
  domain_name = "${var.lambda_function_name}.${var.domain}"
  certificate_arn = "${data.aws_acm_certificate.acm_cert.arn}"
}

data "aws_route53_zone" "aws_zone" {
  name         = "${var.domain}."
}

resource "aws_api_gateway_base_path_mapping" "api_gw_mapping" {
  api_id      = "${aws_api_gateway_rest_api.code_bnb.id}"
  stage_name  = "${var.stage_name}"
  domain_name = "${aws_api_gateway_domain_name.api_gw_domain.domain_name}"
}

resource "aws_route53_record" "api_gw_r53" {
  zone_id = "${data.aws_route53_zone.aws_zone.id}"

  name = "${aws_api_gateway_domain_name.api_gw_domain.domain_name}"
  type = "A"

  alias {
    name                   = "${aws_api_gateway_domain_name.api_gw_domain.cloudfront_domain_name}"
    zone_id                = "${aws_api_gateway_domain_name.api_gw_domain.cloudfront_zone_id}"
    evaluate_target_health = true
  }
}

resource "aws_api_gateway_integration" "post_assignment" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id = "${aws_api_gateway_method.post_assignment.resource_id}"
  http_method = "${aws_api_gateway_method.post_assignment.http_method}"

  integration_http_method = "${aws_api_gateway_method.post_assignment.http_method}"
  type                    = "AWS_PROXY"
  uri                     = "${aws_lambda_function.code_bnb.invoke_arn}"
}

resource "aws_api_gateway_integration" "get_assignment" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id = "${aws_api_gateway_method.get_assignment.resource_id}"
  http_method = "${aws_api_gateway_method.get_assignment.http_method}"

  integration_http_method = "${aws_api_gateway_method.get_assignment.http_method}"
  type                    = "AWS_PROXY"
  uri                     = "${aws_lambda_function.code_bnb.invoke_arn}"
}

resource "aws_api_gateway_integration" "add_candidate" {
  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id = "${aws_api_gateway_method.add_candidate.resource_id}"
  http_method = "${aws_api_gateway_method.add_candidate.http_method}"

  integration_http_method = "${aws_api_gateway_method.add_candidate.http_method}"
  type                    = "AWS_PROXY"
  uri                     = "${aws_lambda_function.code_bnb.invoke_arn}"
}


resource "aws_api_gateway_method" "add_candidate_root" {
  rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id   = "${aws_api_gateway_rest_api.code_bnb.root_resource_id}"
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "post_assignment_root" {
  rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
  resource_id   = "${aws_api_gateway_rest_api.code_bnb.root_resource_id}"
  http_method   = "POST"
  authorization = "NONE"
}

# Not clear we need to support OPTIONS
# resource "aws_api_gateway_method" "options_method" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.add_candidate.id}"
#     http_method   = "OPTIONS"
#     authorization = "NONE"
# }
#
# resource "aws_api_gateway_method" "options_method" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.get_assignment.id}"
#     http_method   = "OPTIONS"
#     authorization = "NONE"
# }
#
# resource "aws_api_gateway_method" "options_method" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.post_assignment.id}"
#     http_method   = "OPTIONS"
#     authorization = "NONE"
# }

# The following are responses for the options200, but have not been customized and so still reference
# "waitlist"
# resource "aws_api_gateway_method_response" "options_200" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.waitlist.id}"
#     http_method   = "${aws_api_gateway_method.options_method.http_method}"
#     status_code   = 200
#     response_models {
#         "application/json" = "Empty"
#     }
#     response_parameters {
#         "method.response.header.Access-Control-Allow-Headers" = true,
#         "method.response.header.Access-Control-Allow-Methods" = true,
#         "method.response.header.Access-Control-Allow-Origin" = true
#     }
#     depends_on = ["aws_api_gateway_method.options_method"]
# }
#
# resource "aws_api_gateway_integration" "options_integration" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.waitlist.id}"
#     http_method   = "${aws_api_gateway_method.options_method.http_method}"
#     type          = "MOCK"
#     depends_on = ["aws_api_gateway_method.options_method"]
#     request_templates {
#       "application/json" = <<EOF
# {
#  "statusCode" : 200
# }
# EOF
#       "application/xml" = <<EOF
# {
# "body" : $input.json('$')
# }
# EOF
#   }
# }
#
# resource "aws_api_gateway_integration_response" "options_integration_response" {
#     rest_api_id   = "${aws_api_gateway_rest_api.code_bnb.id}"
#     resource_id   = "${aws_api_gateway_resource.waitlist.id}"
#     http_method   = "${aws_api_gateway_method.options_method.http_method}"
#     status_code   = "${aws_api_gateway_method_response.options_200.status_code}"
#     response_parameters = {
#         "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
#         "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT'",
#         "method.response.header.Access-Control-Allow-Origin" = "'*'"
#     }
#     depends_on = ["aws_api_gateway_method_response.options_200"]
# }

# resource "aws_api_gateway_method_settings" "options_logging" {
#   rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
#   stage_name  = "${var.stage_name}"
#   method_path = "${aws_api_gateway_resource.waitlist.path_part}/${aws_api_gateway_method.waitlist.http_method}"
#
#   settings {
#     metrics_enabled = true
#     logging_level   = "INFO"
#   }
# }

# TODO: Not sure if we need this?
# resource "aws_api_gateway_integration" "lambda_root" {
#   rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
#   resource_id = "${aws_api_gateway_method.waitlist_root.resource_id}"
#   http_method = "${aws_api_gateway_method.waitlist_root.http_method}"
#
#   integration_http_method = "POST"
#   type                    = "AWS_PROXY"
#   uri                     = "${aws_lambda_function.productLanding.invoke_arn}"
# }

resource "aws_api_gateway_deployment" "productLandingApiGatewayDeployment" {
  depends_on = [
    "aws_api_gateway_integration.get_assignment",
    "aws_api_gateway_integration.add_candidate",
    "aws_api_gateway_integration.post_assignment"
  ]

  rest_api_id = "${aws_api_gateway_rest_api.code_bnb.id}"
  stage_name  = "${var.stage_name}"
}

resource "aws_lambda_permission" "apigw_lambda_add_candidate_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.code_bnb.function_name}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.code_bnb.id}/*/${aws_api_gateway_method.add_candidate.http_method}${aws_api_gateway_resource.add_candidate.path}"
}

resource "aws_lambda_permission" "apigw_lambda_get_assignment_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.code_bnb.function_name}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.code_bnb.id}/*/${aws_api_gateway_method.get_assignment.http_method}${aws_api_gateway_resource.get_assignment.path}"
}

resource "aws_lambda_permission" "apigw_lambda_post_assignment_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.code_bnb.function_name}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.code_bnb.id}/*/${aws_api_gateway_method.post_assignment.http_method}${aws_api_gateway_resource.post_assignment.path}"
}

resource "aws_api_gateway_account" "demo" {
  cloudwatch_role_arn = "${aws_iam_role.cloudwatch.arn}"
}

resource "aws_iam_role" "cloudwatch" {
  name = "api_gateway_cloudwatch_global"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "cloudwatch" {
  name = "default"
  role = "${aws_iam_role.cloudwatch.id}"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}
