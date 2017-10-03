### AWS Deployment using SAM
The AWS Serverless Application Model (SAM) extends AWS CloudFormation to provide a simplified way of defining the Amazon API Gateway APIs, AWS Lambda functions, and other AWS resources needed by your serverless application.

##### Pre-requirements
* lambda code should be packaged and uploaded to s3
* template.yaml should be updated with lambda s3 location and proper handler name

##### Deployment process
To deploy for the first time, and for each update, run both of the following commands in order:
```
aws cloudformation package --template-file template.yaml \
--output-template-file template-out.yaml
```
```
aws cloudformation deploy --template-file template-out.yaml \
--stack-name <STACK_NAME> --capabilities CAPABILITY_IAM
```

##### API name lookup
After CloudFormation stack successfully created you can get API Gateway URL by looking into stack output or using following aws cli command:
```
aws cloudformation describe-stacks --stack-name <STACK_NAME> --query Stacks[].Outputs[].OutputValue
```
