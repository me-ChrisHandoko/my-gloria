# Organizational Structure Module - Unit Tests

## Overview
Comprehensive unit test suite for the Organizational Structure module, covering all services, controllers, validators, and business logic.

## Test Coverage
- **Target Coverage**: ≥80% for all metrics
- **Current Coverage**: Run `npm run test:cov` to check

## Test Structure

```
tests/
├── setup/
│   ├── test.setup.ts      # Mock factories and test utilities
│   └── jest.setup.ts      # Jest configuration
├── services/
│   ├── school.service.spec.ts
│   ├── department.service.spec.ts
│   ├── position.service.spec.ts
│   ├── user-position.service.spec.ts
│   └── hierarchy.service.spec.ts
├── controllers/
│   └── school.controller.spec.ts  # Example controller test
└── README.md
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- school.service.spec

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Debug tests
npm run test:debug
```

## Test Categories

### 1. Service Tests
Each service test covers:
- **CRUD Operations**: Create, Read, Update, Delete
- **Business Logic**: Validation, calculations, transformations
- **Security**: RLS checks, permission validation
- **Transactions**: Database transaction handling
- **Error Handling**: Exception scenarios
- **Audit Logging**: Audit trail creation

### 2. Controller Tests
Controller tests verify:
- **Request Handling**: DTO validation, parameter parsing
- **Response Format**: Correct response structure
- **HTTP Status Codes**: Appropriate status codes
- **Guard Integration**: Authentication/authorization
- **Error Propagation**: Exception handling

### 3. Validator Tests
Validator tests ensure:
- **Business Rules**: Constraint enforcement
- **Data Integrity**: Referential integrity
- **Edge Cases**: Boundary conditions
- **Circular References**: Hierarchy validation

## Mock Strategy

### Database Mocks
- `mockPrismaService()`: Mocks all Prisma operations
- Transaction support with callback execution
- Model-specific mock methods

### Security Mocks
- `mockRLSService()`: Row-level security mocks
- `mockAuditService()`: Audit logging mocks
- Configurable permission responses

### Validator Mocks
- `mockDepartmentValidator()`: Department validation
- `mockPositionValidator()`: Position validation
- `mockHierarchyValidator()`: Hierarchy validation

## Test Data Factories

### Creating Test Data
```typescript
import {
  createMockSchool,
  createMockDepartment,
  createMockPosition,
  createMockUserPosition,
  createMockPositionHierarchy,
  createMockUserProfile
} from '../setup/test.setup';

// Create with defaults
const school = createMockSchool();

// Create with overrides
const customSchool = createMockSchool({
  name: 'Custom School',
  lokasi: 'Surabaya'
});
```

## Test Patterns

### Testing Service Methods
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await createTestModule([ServiceName]);
    service = module.get<ServiceName>(ServiceName);
    prismaService = module.get(PrismaService);
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* ... */ };
      const expected = { /* ... */ };
      prismaService.model.method = jest.fn().mockResolvedValue(expected);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
      expect(prismaService.model.method).toHaveBeenCalledWith(/* ... */);
    });

    it('should handle error case', async () => {
      // Arrange
      prismaService.model.method = jest.fn().mockRejectedValue(new Error());

      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow();
    });
  });
});
```

### Testing Transactions
```typescript
it('should execute in transaction', async () => {
  const mockData = createMockData();
  prismaService.$transaction = jest.fn(callback => callback(prismaService));
  prismaService.model.create = jest.fn().mockResolvedValue(mockData);

  await service.createWithTransaction(dto);

  expectTransaction(prismaService);
});
```

### Testing RLS
```typescript
it('should check RLS permissions', async () => {
  rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

  await expect(service.protectedMethod()).rejects.toThrow(ForbiddenException);
  expectRLSCheck(rlsService, 'EntityType', 'ACTION');
});
```

## Custom Matchers

### toBeValidUUID()
```typescript
expect(result.id).toBeValidUUID();
```

### toHaveBeenCalledWithPartial()
```typescript
expect(mockFunction).toHaveBeenCalledWithPartial({ 
  name: 'Expected Name' 
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe the scenario
3. **Coverage**: Test both success and failure paths
4. **Mocking**: Mock external dependencies
5. **Assertions**: Use specific assertions
6. **Cleanup**: Clear mocks after each test

## Debugging Tests

### Using VS Code
1. Add breakpoint in test file
2. Run "Jest: Debug" from command palette
3. Use debugger to step through code

### Console Logging
```typescript
// Temporarily enable console for debugging
global.console.log = console.log;
console.log('Debug:', variable);
```

### Verbose Output
```bash
npm test -- --verbose
```

## Continuous Integration

### GitHub Actions
```yaml
- name: Run tests
  run: npm test
  
- name: Generate coverage
  run: npm run test:cov
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **Module not found**
   - Check import paths
   - Verify jest.config.js moduleNameMapper

2. **Timeout errors**
   - Increase timeout: `jest.setTimeout(20000)`
   - Check for unresolved promises

3. **Mock not working**
   - Ensure mock is set before method call
   - Check mock function signature

4. **Transaction tests failing**
   - Verify transaction mock returns mocked service
   - Check callback execution

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure ≥80% coverage
3. Follow existing patterns
4. Update this README if needed