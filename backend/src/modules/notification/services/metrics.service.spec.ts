import { Test, TestingModule } from '@nestjs/testing';
import { NotificationMetricsService } from './metrics.service';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';
import { NotificationType, Priority, NotificationChannel } from '../enums/notification.enum';

describe('NotificationMetricsService', () => {
  let service: NotificationMetricsService;
  let mockCounter: jest.Mocked<Counter<string>>;
  let mockHistogram: jest.Mocked<Histogram<string>>;
  let mockGauge: jest.Mocked<Gauge<string>>;
  let mockSummary: jest.Mocked<Summary<string>>;

  beforeEach(async () => {
    // Create mock metrics
    mockCounter = {
      inc: jest.fn(),
      get: jest.fn(),
      reset: jest.fn(),
    } as any;

    mockHistogram = {
      observe: jest.fn(),
      get: jest.fn(),
      reset: jest.fn(),
    } as any;

    mockGauge = {
      set: jest.fn(),
      get: jest.fn(),
      reset: jest.fn(),
    } as any;

    mockSummary = {
      observe: jest.fn(),
      get: jest.fn(),
      reset: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationMetricsService,
        // Provide mock metrics
        { provide: 'PROM_METRIC_NOTIFICATION_SENT_TOTAL', useValue: mockCounter },
        { provide: 'PROM_METRIC_NOTIFICATION_FAILED_TOTAL', useValue: mockCounter },
        { provide: 'PROM_METRIC_NOTIFICATION_PROCESSING_DURATION_MS', useValue: mockHistogram },
        { provide: 'PROM_METRIC_NOTIFICATION_QUEUE_SIZE', useValue: mockGauge },
        { provide: 'PROM_METRIC_NOTIFICATION_DELIVERY_RATE', useValue: mockSummary },
        { provide: 'PROM_METRIC_NOTIFICATION_RETRY_COUNT', useValue: mockCounter },
        { provide: 'PROM_METRIC_NOTIFICATION_CHANNEL_PERFORMANCE_MS', useValue: mockHistogram },
        { provide: 'PROM_METRIC_NOTIFICATION_DEAD_LETTER_QUEUE_SIZE', useValue: mockGauge },
        { provide: 'PROM_METRIC_NOTIFICATION_RATE_LIMIT_HITS', useValue: mockCounter },
        { provide: 'PROM_METRIC_NOTIFICATION_CIRCUIT_BREAKER_STATUS', useValue: mockGauge },
        { provide: 'PROM_METRIC_NOTIFICATION_BATCH_SIZE', useValue: mockHistogram },
        { provide: 'PROM_METRIC_NOTIFICATION_TEMPLATE_RENDER_DURATION_MS', useValue: mockHistogram },
        { provide: 'PROM_METRIC_NOTIFICATION_DATABASE_QUERY_DURATION_MS', useValue: mockHistogram },
        { provide: 'PROM_METRIC_NOTIFICATION_ACTIVE_CONNECTIONS', useValue: mockGauge },
      ],
    }).compile();

    service = module.get<NotificationMetricsService>(NotificationMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordNotificationSent', () => {
    it('should increment the notification sent counter', () => {
      service.recordNotificationSent(
        NotificationType.GENERAL,
        Priority.HIGH,
        NotificationChannel.EMAIL,
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: NotificationType.GENERAL,
        priority: Priority.HIGH,
        channel: NotificationChannel.EMAIL,
      });
    });
  });

  describe('recordNotificationFailed', () => {
    it('should increment the notification failed counter', () => {
      service.recordNotificationFailed(
        NotificationType.APPROVAL_REQUEST,
        Priority.URGENT,
        NotificationChannel.PUSH,
        'Network error',
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: NotificationType.APPROVAL_REQUEST,
        priority: Priority.URGENT,
        channel: NotificationChannel.PUSH,
        reason: 'Network error',
      });
    });
  });

  describe('recordProcessingDuration', () => {
    it('should record processing duration in histogram', () => {
      service.recordProcessingDuration(
        NotificationType.SYSTEM_ALERT,
        Priority.CRITICAL,
        1500,
      );

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          type: NotificationType.SYSTEM_ALERT,
          priority: Priority.CRITICAL,
        },
        1500,
      );
    });
  });

  describe('updateQueueSize', () => {
    it('should update queue size gauge', () => {
      service.updateQueueSize('main', 250);

      expect(mockGauge.set).toHaveBeenCalledWith(
        {
          queue: 'main',
        },
        250,
      );
    });
  });

  describe('updateDeadLetterQueueSize', () => {
    it('should update dead letter queue size', () => {
      service.updateDeadLetterQueueSize(50);

      expect(mockGauge.set).toHaveBeenCalledWith(50);
    });
  });

  describe('recordRateLimitHit', () => {
    it('should increment rate limit counter', () => {
      service.recordRateLimitHit('user123', NotificationType.GENERAL);

      expect(mockCounter.inc).toHaveBeenCalledWith({
        type: NotificationType.GENERAL,
      });
    });
  });

  describe('updateCircuitBreakerStatus', () => {
    it('should set circuit breaker status to 0 for open', () => {
      service.updateCircuitBreakerStatus('email', 'open');

      expect(mockGauge.set).toHaveBeenCalledWith(
        {
          service: 'email',
        },
        0,
      );
    });

    it('should set circuit breaker status to 1 for closed', () => {
      service.updateCircuitBreakerStatus('push', 'closed');

      expect(mockGauge.set).toHaveBeenCalledWith(
        {
          service: 'push',
        },
        1,
      );
    });

    it('should set circuit breaker status to 0.5 for half-open', () => {
      service.updateCircuitBreakerStatus('sms', 'half-open');

      expect(mockGauge.set).toHaveBeenCalledWith(
        {
          service: 'sms',
        },
        0.5,
      );
    });
  });

  describe('startTimer', () => {
    it('should return a function that calculates elapsed time', async () => {
      const timer = service.startTimer();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const elapsed = timer();
      
      // Should be at least 100ms but allow some variance
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('recordChannelPerformance', () => {
    it('should record channel performance metrics', () => {
      service.recordChannelPerformance(
        NotificationChannel.EMAIL,
        250,
        true,
      );

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          channel: NotificationChannel.EMAIL,
          success: 'true',
        },
        250,
      );
    });
  });

  describe('recordBatchSize', () => {
    it('should record batch size in histogram', () => {
      service.recordBatchSize(NotificationChannel.EMAIL, 100);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          channel: NotificationChannel.EMAIL,
        },
        100,
      );
    });
  });

  describe('recordTemplateRenderDuration', () => {
    it('should record template render duration', () => {
      service.recordTemplateRenderDuration('welcome_email', 50);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          template: 'welcome_email',
        },
        50,
      );
    });
  });

  describe('recordDatabaseQueryDuration', () => {
    it('should record database query duration', () => {
      service.recordDatabaseQueryDuration('findAll', 25);

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        {
          operation: 'findAll',
        },
        25,
      );
    });
  });

  describe('updateActiveConnections', () => {
    it('should update active connections gauge', () => {
      service.updateActiveConnections('email', 5);

      expect(mockGauge.set).toHaveBeenCalledWith(
        {
          service: 'email',
        },
        5,
      );
    });
  });
});