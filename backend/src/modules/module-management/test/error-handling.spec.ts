import { Test, TestingModule } from '@nestjs/testing';
import { ModuleService } from '../services/module.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ModuleNotFoundError,
  ModuleCodeAlreadyExistsError,
  CircularDependencyError,
  DatabaseOperationError,
} from '../errors/module-errors';
import { RetryHandler, CircuitBreaker } from '../utils/error-recovery.util';

describe('Enhanced Error Handling', () => {
  let service: ModuleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        {
          provide: PrismaService,
          useValue: {
            module: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            generateId: jest.fn(() => 'test-id'),
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ModuleService>(ModuleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Custom Error Classes', () => {
    it('should throw ModuleNotFoundError when module does not exist', async () => {
      jest.spyOn(prisma.module, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        ModuleNotFoundError,
      );
    });

    it('should throw ModuleCodeAlreadyExistsError when code exists', async () => {
      jest.spyOn(prisma.module, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        code: 'EXISTING_CODE',
      } as any);

      await expect(
        service.create({
          code: 'EXISTING_CODE',
          name: 'Test Module',
          category: 'SYSTEM',
        } as any),
      ).rejects.toThrow(ModuleCodeAlreadyExistsError);
    });

    it('should include error context in custom errors', async () => {
      jest.spyOn(prisma.module, 'findUnique').mockResolvedValue(null);

      try {
        await service.findOne('test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(ModuleNotFoundError);
        expect(error.context).toBeDefined();
        expect(error.context.moduleId).toBe('test-id');
        expect(error.errorCode).toBe('MODULE_NOT_FOUND');
      }
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry database operations on transient errors', async () => {
      const retryHandler = new RetryHandler();
      let attempts = 0;
      
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Connection timeout');
          error['code'] = 'ETIMEDOUT';
          throw error;
        }
        return Promise.resolve({ id: 'success' });
      });

      const result = await retryHandler.execute(
        operation,
        'testOperation',
        { maxAttempts: 3, delay: 10 },
      );

      expect(result).toEqual({ id: 'success' });
      expect(attempts).toBe(3);
    });

    it('should not retry on non-transient errors', async () => {
      const retryHandler = new RetryHandler();
      
      const operation = jest.fn().mockRejectedValue(
        new Error('Validation error'),
      );

      await expect(
        retryHandler.execute(operation, 'testOperation', {
          maxAttempts: 3,
          delay: 10,
        }),
      ).rejects.toThrow(DatabaseOperationError);

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const circuitBreaker = new CircuitBreaker('test', {
        failureThreshold: 3,
        resetTimeout: 100,
      });

      const failingOperation = jest.fn().mockRejectedValue(
        new Error('Service unavailable'),
      );

      // Fail 3 times to open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Next call should fail immediately without executing operation
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        'Circuit breaker test is OPEN',
      );
      
      // Operation should not be called when circuit is open
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should reset circuit after timeout', async () => {
      const circuitBreaker = new CircuitBreaker('test', {
        failureThreshold: 2,
        resetTimeout: 50,
      });

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('Success');

      // Open the circuit
      try {
        await circuitBreaker.execute(operation);
      } catch {}
      try {
        await circuitBreaker.execute(operation);
      } catch {}

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Circuit should attempt reset (HALF_OPEN)
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('Success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('Error Context Builder', () => {
    it('should build comprehensive error context', () => {
      const error = new ModuleNotFoundError('test-id', {
        operation: 'findModule',
        timestamp: '2024-01-01T00:00:00Z',
        userId: 'user-123',
      });

      expect(error.context).toEqual({
        moduleId: 'test-id',
        operation: 'findModule',
        timestamp: '2024-01-01T00:00:00Z',
        userId: 'user-123',
      });
      expect(error.errorCode).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('Database Operation Error Handling', () => {
    it('should wrap database errors with context', async () => {
      const dbError = new Error('Database connection failed');
      dbError['code'] = 'P2024';
      
      jest.spyOn(prisma.module, 'findUnique').mockRejectedValue(dbError);

      try {
        await service.findOne('test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseOperationError);
        expect(error.errorCode).toBe('DATABASE_OPERATION_FAILED');
        expect(error.context.operation).toBe('findModule');
        expect(error.context.originalError).toBe('Database connection failed');
      }
    });
  });
});