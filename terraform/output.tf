output "api_gw_base_url" {
  value = "${aws_api_gateway_deployment.codeBnbApiGatewayDeployment.invoke_url}"
}

output "aws_api_gateway_domain_name" {
  value = "${lower(var.lambda_function_name)}.${lower(var.domain)}"
}
