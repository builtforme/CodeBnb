const sinon = require('sinon');
const email = require('../email');

let mockEmailService;
beforeEach(() => {
  mockEmailService = {
    sendEmail: sinon.spy() // Create a spy for the sendEmail method
  };
});

describe("Email.js", () => {
  describe("sendRevocationNotification", () => {
    it("should call email service's sendEmail method", () => {
      const testCandidateName = "MOCK_NAME";
      email.sendRevocationNotification(testCandidateName, mockEmailService);
      return expect(mockEmailService.sendEmail.calledOnce).toBe(true);
    });

    it("should format subject data correctly with candidate name", () => {
      const testCandidateName = "MOCK_NAME";
      const expectedtTitle = `${testCandidateName} has completed the assignment`;
      email.sendRevocationNotification(testCandidateName, mockEmailService);
      const calledWithArg = mockEmailService.sendEmail.args[0][0];
      const argumentSubjectData = calledWithArg.Message.Subject.Data;
      return expect(argumentSubjectData).toBe(expectedtTitle);
    });
  });
});
