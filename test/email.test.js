const sinon = require('sinon');
const email = require('../email');

const getMockEmailService = (sendEmailImpl) => {
  return {
    sendEmail: sendEmailImpl
  };
};

let mockEmailService;
beforeEach(() => {
  // Create a mock email service with a spy implementation of sendEmail
  mockEmailService = getMockEmailService(sinon.spy());
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

    describe("Email Service Callback", () => {
      it("should resolve with undefined if no error present", () => {
        const mockEmailServiceWithNoError = getMockEmailService((options, callback) => callback(null, {}));

        const resultPromise = email.sendRevocationNotification("MOCK_NAME_1", mockEmailServiceWithNoError);
        return expect(resultPromise).resolves.toEqual(undefined);
      });

      it("should reject with an error if an error is present", () => {
        const mockError = {
          'error': 'This is a mock error'
        };
        const mockEmailServiceWithError = getMockEmailService((options, callback) => callback(mockError, {}));

        const resultPromise = email.sendRevocationNotification("MOCK_NAME_1", mockEmailServiceWithError);
        return expect(resultPromise).rejects.toEqual(mockError);
      });
    });
  });

  describe("sendInvitationExpiringNotification", () => {
    it("should call email service's sendEmail method", () => {
      const testCandidateNames = "MOCK_NAME_1, MOCK_NAME_2";
      email.sendInvitationExpiringNotification(testCandidateNames, mockEmailService);
      return expect(mockEmailService.sendEmail.calledOnce).toBe(true);
    });

    it("should format message body data correctly with candidate names", () => {
      const testCandidateNames = "MOCK_NAME_1, MOCK_NAME_2";
      const expectedBody = `The following candidates have not started their assignment: ${testCandidateNames}`;
      email.sendInvitationExpiringNotification(testCandidateNames, mockEmailService);
      const calledWithArg = mockEmailService.sendEmail.args[0][0];
      const argumentMessageData = calledWithArg.Message.Body.Text.Data;
      return expect(argumentMessageData).toBe(expectedBody);
    });

    describe("Email Service Callback", () => {
      it("should resolve with undefined if no error present", () => {
        const mockEmailServiceWithNoError = getMockEmailService((options, callback) => callback(null, {}));

        const resultPromise = email.sendInvitationExpiringNotification("MOCK_NAME_1, MOCK_NAME_2", mockEmailServiceWithNoError);
        return expect(resultPromise).resolves.toEqual(undefined);
      });

      it("should reject with an error if an error is present", () => {
        const mockError = {
          'error': 'This is a mock error'
        };
        const mockEmailServiceWithError = getMockEmailService((options, callback) => callback(mockError, {}));

        const resultPromise = email.sendInvitationExpiringNotification("MOCK_NAME_1, MOCK_NAME_2", mockEmailServiceWithError);
        return expect(resultPromise).rejects.toEqual(mockError);
      });
    });
  });
});
