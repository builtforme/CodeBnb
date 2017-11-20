const aws = require('aws-sdk');
const Promise = require('bluebird');

const ses = new aws.SES({
  region: 'us-east-1'
});


exports.sendRevocationNotification = (candidateName, emailService = ses) => {
  return new Promise((resolve, reject) => {
    emailService.sendEmail({
      Destination: {
        ToAddresses: [process.env.REVOCATION_NOTIFICATION_RECEPIENT]
      },
      Message: {
        Body: {
          Text: {
            Data: 'Access to the project repository has been removed. Please review their work.'
          }
        },
        Subject: {
          Data: `${candidateName} has completed the assignment`
        }
      },
      Source: process.env.EMAIL_FROM
    }, function(err, data){
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

exports.sendRevocationNotification = (candidateName, emailService = ses) => {
  return new Promise((resolve, reject) => {
    emailService.sendEmail({
      Destination: {
        ToAddresses: [process.env.REVOCATION_NOTIFICATION_RECEPIENT]
      },
      Message: {
        Body: {
          Text: {
            Data: 'The project repository has been archived. No further action is necessary.'
          }
        },
        Subject: {
          Data: `${candidateName}'s assignment has been archived`
        }
      },
      Source: process.env.EMAIL_FROM
    }, function(err, data){
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

exports.sendInvitationExpiringNotification = (candidateNames, emailService = ses) => {
  return new Promise((resolve, reject) => {
    emailService.sendEmail({
      Destination: {
        ToAddresses: [process.env.REVOCATION_NOTIFICATION_RECEPIENT]
      },
      Message: {
        Body: {
          Text: {
            Data: 'The following candidates have not started their assignment: ' + candidateNames
          }
        },
        Subject: {
          Data: `Project Invitations Expiring Within 24 Hours`
        }
      },
      Source: process.env.EMAIL_FROM
    }, function(err, data){
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
