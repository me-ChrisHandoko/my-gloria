import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../services/queue.service';
import { QueueMonitoringService } from '../services/queue-monitoring.service';
import { BackupJobData } from '../services/queue.service';
import { BACKUP_JOB_PRIORITY } from '../constants/queue.constants';

/**
 * Test script for concurrent backup queue operations
 * 
 * This test demonstrates:
 * 1. Multiple concurrent backup job submissions
 * 2. Queue concurrency control
 * 3. Job progress monitoring
 * 4. Queue metrics tracking
 */
export async function testConcurrentBackupQueue(
  queueService: QueueService,
  monitoringService: QueueMonitoringService,
) {
  console.log('🚀 Starting concurrent backup queue test...\n');

  // Test configuration
  const NUM_CONCURRENT_JOBS = 5;
  const TEST_USER_ID = 'test-user-123';
  const TEST_ORG_ID = 'test-org-456';

  // Create multiple backup jobs
  const jobPromises: Promise<any>[] = [];
  const jobIds: string[] = [];

  console.log(`📦 Submitting ${NUM_CONCURRENT_JOBS} concurrent backup jobs...`);

  for (let i = 0; i < NUM_CONCURRENT_JOBS; i++) {
    const backupJobData: BackupJobData = {
      backupId: `test-backup-${i}-${Date.now()}`,
      tables: ['users', 'permissions', 'roles'],
      compression: true,
      userId: TEST_USER_ID,
      organizationId: TEST_ORG_ID,
      metadata: {
        testRun: true,
        jobIndex: i,
        priority: i === 0 ? BACKUP_JOB_PRIORITY.URGENT : BACKUP_JOB_PRIORITY.MANUAL,
      },
    };

    const jobPromise = queueService.addBackupJob(backupJobData, {
      priority: backupJobData.metadata?.priority || BACKUP_JOB_PRIORITY.MANUAL,
    });

    jobPromises.push(jobPromise);
  }

  // Wait for all jobs to be queued
  try {
    const jobs = await Promise.all(jobPromises);
    jobs.forEach(job => {
      jobIds.push(job.id.toString());
      console.log(`✅ Job ${job.id} queued with priority ${job.opts.priority}`);
    });
  } catch (error) {
    console.error('❌ Error queuing jobs:', error);
    return;
  }

  console.log('\n📊 Initial queue metrics:');
  const initialMetrics = await queueService.getQueueMetrics();
  console.log(JSON.stringify(initialMetrics, null, 2));

  // Monitor job progress
  console.log('\n👀 Monitoring job progress...');
  
  const monitoringInterval = setInterval(async () => {
    const activeProgress = monitoringService.getAllJobProgress();
    const metrics = await queueService.getQueueMetrics();

    console.log(`\n📈 Active jobs: ${metrics.active}, Waiting: ${metrics.waiting}, Completed: ${metrics.completed}, Failed: ${metrics.failed}`);
    
    activeProgress.forEach(progress => {
      console.log(`  Job ${progress.jobId}: ${progress.progress}% - ${progress.stage || 'processing'} - ${progress.message || ''}`);
    });

    // Check if all jobs are complete
    if (metrics.active === 0 && metrics.waiting === 0) {
      clearInterval(monitoringInterval);
      await displayFinalResults();
    }
  }, 2000); // Check every 2 seconds

  // Display final results
  async function displayFinalResults() {
    console.log('\n🏁 All jobs completed!\n');

    // Get final metrics
    const finalMetrics = await queueService.getQueueMetrics();
    console.log('📊 Final queue metrics:');
    console.log(JSON.stringify(finalMetrics, null, 2));

    // Get job statistics
    const statistics = await monitoringService.getJobStatistics();
    console.log('\n📈 Job statistics:');
    console.log(JSON.stringify(statistics, null, 2));

    // Check individual job results
    console.log('\n📋 Individual job results:');
    for (const jobId of jobIds) {
      const job = await queueService.getJob(jobId);
      if (job) {
        const state = await job.getState();
        console.log(`  Job ${jobId}: ${state}`);
        if (state === 'failed') {
          console.log(`    Error: ${job.failedReason}`);
        }
      }
    }

    // Test queue health
    const health = await monitoringService.getQueueHealth();
    console.log('\n🏥 Queue health check:');
    console.log(JSON.stringify(health, null, 2));

    // Test cleanup
    console.log('\n🧹 Cleaning up test jobs...');
    const cleanedJobs = await queueService.cleanOldJobs(0, 100, 'completed');
    console.log(`  Cleaned ${cleanedJobs.length} completed jobs`);

    console.log('\n✅ Concurrent backup queue test completed!');
  }

  // Timeout safety (30 seconds max)
  setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log('\n⏱️ Test timed out after 30 seconds');
    process.exit(1);
  }, 30000);
}

// Example usage in a test file or script:
/*
async function runTest() {
  // Initialize services (this would normally be done through dependency injection)
  const module: TestingModule = await Test.createTestingModule({
    imports: [QueueModule],
  }).compile();

  const queueService = module.get<QueueService>(QueueService);
  const monitoringService = module.get<QueueMonitoringService>(QueueMonitoringService);

  await testConcurrentBackupQueue(queueService, monitoringService);
}

// Run the test
runTest().catch(console.error);
*/