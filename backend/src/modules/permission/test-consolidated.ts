// Test file to verify the consolidated permission module can be imported
import { Test } from '@nestjs/testing';
import { PermissionModule } from './permission.module';

async function testConsolidatedModule() {
  console.log('Testing consolidated permission module...');
  
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [PermissionModule],
    }).compile();

    // Verify services are available
    const services = [
      'PermissionService',
      'RoleService',
      'UserPermissionService',
      'PermissionPolicyService',
      'PermissionCacheService',
      'PolicyEngineService',
    ];

    for (const serviceName of services) {
      const service = moduleRef.get(serviceName, { strict: false });
      if (service) {
        console.log(`✅ ${serviceName} is available`);
      } else {
        console.log(`❌ ${serviceName} is NOT available`);
      }
    }

    console.log('\n✅ Consolidated permission module loaded successfully!');
  } catch (error) {
    console.error('❌ Failed to load consolidated permission module:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testConsolidatedModule();
}

export { testConsolidatedModule };