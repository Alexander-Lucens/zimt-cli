// Mock for jsonwebtoken module used by @nestjs/jwt
module.exports = {
  sign: jest.fn((payload, options) => {
    return 'mock-jwt-token';
  }),
  verify: jest.fn((token, options) => {
    return { userId: 'mock-user-id', login: 'mock-user', roles: ['user'] };
  }),
  decode: jest.fn((token) => {
    return { userId: 'mock-user-id', login: 'mock-user', roles: ['user'] };
  }),
};
