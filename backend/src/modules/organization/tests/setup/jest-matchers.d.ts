/**
 * Custom Jest matcher type definitions
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if a string is a valid UUID
       */
      toBeValidUUID(): R;

      /**
       * Checks if a mock function was called with arguments that partially match the expected object
       */
      toHaveBeenCalledWithPartial(expected: any): R;
    }
  }
}

export {};
