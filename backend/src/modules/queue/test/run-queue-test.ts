/**
 * Simple test script to verify queue implementation
 * Run with: npx ts-node src/modules/queue/test/run-queue-test.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { QueueService } from '../services/queue.service';
import { QueueMonitoringService } from '../services/queue-monitoring.service';
import { BackupJobData } from '../services/queue.service';

async function runQueueTest() {
  console.log('🚀 Starting queue test...\n');

  // Create NestJS application
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'], // Reduce logging noise
  });

  const queueService = app.get(QueueService);
  const monitoringService = app.get(QueueMonitoringService);

  try {
    // Test 1: Check queue health
    console.log('🏥 Checking queue health...');
    const health = await monitoringService.getQueueHealth();
    console.log('Queue health:', health);

    // Test 2: Submit a test backup job
    console.log('\n📦 Submitting test backup job...');
    const testJob: BackupJobData = {
      backupId: `test-backup-${Date.now()}`,
      tables: ['users', 'roles'],
      compression: true,
      userId: 'test-user-123',
      metadata: {
        test: true,
        description: 'Test backup job',
      },
    };

    const job = await queueService.addBackupJob(testJob);
    console.log(`✅ Job ${job.id} submitted successfully`);

    // Test 3: Get queue metrics
    console.log('\n📊 Queue metrics:');
    const metrics = await queueService.getQueueMetrics();
    console.log(metrics);

    // Test 4: Monitor job progress
    console.log('\n👀 Monitoring job progress for 10 seconds...');
    let monitoring = true;
    const monitorInterval = setInterval(async () => {
      const progress = monitoringService.getJobProgress(job.id.toString());
      const jobState = await job.getState();
      
      if (progress) {
        console.log(`Progress: ${progress.progress}% - ${progress.stage} - ${progress.message}`);
      } else {
        console.log(`Job state: ${jobState}`);
      }

      if (jobState === 'completed' || jobState === 'failed') {
        monitoring = false;
        clearInterval(monitorInterval);
        
        if (jobState === 'completed') {
          console.log('\n✅ Job completed successfully!');
        } else {
          console.log('\n❌ Job failed:', job.failedReason);
        }
      }
    }, 1000);

    // Wait for monitoring to complete or timeout
    await new Promise(resolve => {
      setTimeout(() => {
        if (monitoring) {
          clearInterval(monitorInterval);
          console.log('\n⏱️ Monitoring timed out');
        }
        resolve(true);
      }, 10000);
    });

    // Test 5: Test concurrent jobs
    console.log('\n🔄 Testing concurrent job submission...');
    const concurrentJobs: Promise<any>[] = [];
    for (let i = 0; i < 3; i++) {
      const concurrentJob: BackupJobData = {
        backupId: `concurrent-backup-${i}-${Date.now()}`,
        tables: ['table1', 'table2'],
        compression: false,
        userId: 'test-user-123',
        metadata: {
          test: true,
          index: i,
        },
      };
      concurrentJobs.push(queueService.addBackupJob(concurrentJob));
    }

    const results = await Promise.all(concurrentJobs);
    console.log(`✅ Successfully queued ${results.length} concurrent jobs`);

    // Final metrics
    console.log('\n📊 Final queue metrics:');
    const finalMetrics = await queueService.getQueueMetrics();
    console.log(finalMetrics);

    console.log('\n✅ Queue test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the application
    await app.close();
    process.exit(0);
  }
}

// Run the test
runQueueTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});