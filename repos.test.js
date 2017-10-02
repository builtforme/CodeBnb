const repos = require('./repos');

test('repos should have function initializeCandidate', () => {
  expect(typeof repos.initializeCandidate).toBe('function');
});

test('repos should have function removeCollaboratorAccess', () => {
  expect(typeof repos.removeCollaboratorAccess).toBe('function');
});
