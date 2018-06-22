output "AWS API Gateway Endpoint" {
  value = "${aws_api_gateway_deployment.codeBnbApiGatewayDeployment.invoke_url}/addcandidate?authorization=${var.add_candidate_authorization_code}"
}

output "Custom Domain Endpoint (start here)" {
  value = "https://${lower(var.lambda_function_name)}.${lower(var.domain)}/addcandidate?authorization=${var.add_candidate_authorization_code}"
}

#output ""
