/**
 * Jest setup file for Organization module tests
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.CLERK_PUBLISHABLE_KEY = 'test-clerk-public';

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests unless debugging
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Date.now() for consistent timestamps in tests
const mockNow = new Date('2024-01-01T00:00:00.000Z').getTime();
global.Date.now = jest.fn(() => mockNow);

// Add custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  toHaveBeenCalledWithPartial(received: jest.Mock, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call) =>
      call.some((arg) =>
        JSON.stringify(arg).includes(JSON.stringify(expected)),
      ),
    );

    return {
      pass,
      message: () =>
        pass
          ? `expected function not to have been called with partial match ${JSON.stringify(expected)}`
          : `expected function to have been called with partial match ${JSON.stringify(expected)}`,
    };
  },
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test timeout
jest.setTimeout(10000);
