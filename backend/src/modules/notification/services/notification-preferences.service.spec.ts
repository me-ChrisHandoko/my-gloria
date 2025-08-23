import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  NotificationChannel, 
  NotificationType, 
  Priority 
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as moment from 'moment-timezone';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prisma: PrismaService;

  const mockUserProfileId = 'test-user-123';
  const mockPreferenceId = 'pref-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: PrismaService,
          useValue: {
            notificationPreference: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            notificationChannelPreference: {
              upsert: jest.fn(),
            },
            notificationUnsubscribe: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            notificationFrequencyTracking: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              aggregate: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreatePreferences', () => {
    it('should return existing preferences if found', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
        enabled: true,
        defaultChannels: [NotificationChannel.IN_APP],
        channelPreferences: [],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getOrCreatePreferences(mockUserProfileId);

      expect(result).toEqual(mockPreferences);
      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userProfileId: mockUserProfileId },
        include: {
          channelPreferences: true,
          unsubscriptions: {
            where: { resubscribedAt: null },
          },
        },
      });
    });

    it('should create new preferences if not found', async () => {
      const mockNewPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
        enabled: true,
        defaultChannels: [NotificationChannel.IN_APP],
        timezone: 'Asia/Jakarta',
        channelPreferences: [],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.notificationPreference.create as jest.Mock).mockResolvedValue(mockNewPreferences);

      const result = await service.getOrCreatePreferences(mockUserProfileId);

      expect(result).toEqual(mockNewPreferences);
      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
        data: {
          userProfileId: mockUserProfileId,
          enabled: true,
          defaultChannels: [NotificationChannel.IN_APP],
          timezone: 'Asia/Jakarta',
        },
        include: {
          channelPreferences: true,
          unsubscriptions: {
            where: { resubscribedAt: null },
          },
        },
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const mockExistingPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
        enabled: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'Asia/Jakarta',
        maxDailyNotifications: null,
        maxHourlyNotifications: null,
        defaultChannels: [NotificationChannel.IN_APP],
      };

      const updateDto = {
        enabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        maxDailyNotifications: 50,
      };

      const mockUpdatedPreferences = {
        ...mockExistingPreferences,
        ...updateDto,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockExistingPreferences);
      (prisma.notificationPreference.update as jest.Mock).mockResolvedValue(mockUpdatedPreferences);

      const result = await service.updatePreferences(mockUserProfileId, updateDto);

      expect(result).toEqual(mockUpdatedPreferences);
      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { id: mockPreferenceId },
        data: expect.objectContaining({
          enabled: false,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          maxDailyNotifications: 50,
        }),
        include: {
          channelPreferences: true,
        },
      });
    });

    it('should throw error if quiet hours enabled without times', async () => {
      const mockExistingPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
        enabled: true,
      };

      const updateDto = {
        quietHoursEnabled: true,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockExistingPreferences);

      await expect(
        service.updatePreferences(mockUserProfileId, updateDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkPreferences', () => {
    it('should allow notification when preferences are enabled', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        enabled: true,
        quietHoursEnabled: false,
        maxDailyNotifications: null,
        maxHourlyNotifications: null,
        defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        channelPreferences: [],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.checkPreferences(
        mockUserProfileId,
        NotificationType.GENERAL,
        Priority.MEDIUM
      );

      expect(result).toEqual({
        shouldSend: true,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    });

    it('should block notification when globally disabled', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        enabled: false,
        channelPreferences: [],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.checkPreferences(
        mockUserProfileId,
        NotificationType.GENERAL,
        Priority.MEDIUM
      );

      expect(result).toEqual({
        shouldSend: false,
        channels: [],
        blockedReason: 'Notifications are disabled',
      });
    });

    it('should block notification when user unsubscribed', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        enabled: true,
        defaultChannels: [NotificationChannel.IN_APP],
        channelPreferences: [],
        unsubscriptions: [
          {
            notificationType: NotificationType.GENERAL,
            resubscribedAt: null,
          },
        ],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.checkPreferences(
        mockUserProfileId,
        NotificationType.GENERAL,
        Priority.MEDIUM
      );

      expect(result).toEqual({
        shouldSend: false,
        channels: [],
        blockedReason: 'User has unsubscribed from this notification type',
      });
    });

    it('should use channel preferences when configured', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        enabled: true,
        quietHoursEnabled: false,
        maxDailyNotifications: null,
        maxHourlyNotifications: null,
        defaultChannels: [NotificationChannel.IN_APP],
        channelPreferences: [
          {
            notificationType: NotificationType.APPROVAL_REQUEST,
            channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
            enabled: true,
            priority: Priority.HIGH,
            maxDaily: null,
          },
        ],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.checkPreferences(
        mockUserProfileId,
        NotificationType.APPROVAL_REQUEST,
        Priority.URGENT
      );

      expect(result).toEqual({
        shouldSend: true,
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      });
    });

    it('should block notification when priority below threshold', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        enabled: true,
        defaultChannels: [NotificationChannel.IN_APP],
        channelPreferences: [
          {
            notificationType: NotificationType.GENERAL,
            channels: [NotificationChannel.EMAIL],
            enabled: true,
            priority: Priority.HIGH,
            maxDaily: null,
          },
        ],
        unsubscriptions: [],
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.checkPreferences(
        mockUserProfileId,
        NotificationType.GENERAL,
        Priority.LOW
      );

      expect(result).toEqual({
        shouldSend: false,
        channels: [],
        blockedReason: `Priority LOW is below threshold HIGH`,
      });
    });
  });

  describe('unsubscribe', () => {
    it('should create unsubscribe record successfully', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
      };

      const unsubscribeDto = {
        notificationType: NotificationType.GENERAL,
        channel: NotificationChannel.EMAIL,
        reason: 'Too many emails',
      };

      const mockUnsubscribe = {
        id: 'unsub-123',
        preferenceId: mockPreferenceId,
        ...unsubscribeDto,
        token: 'test-token',
        unsubscribedAt: new Date(),
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.notificationUnsubscribe.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.notificationUnsubscribe.create as jest.Mock).mockResolvedValue(mockUnsubscribe);

      const result = await service.unsubscribe(mockUserProfileId, unsubscribeDto);

      expect(result).toEqual(mockUnsubscribe);
      expect(prisma.notificationUnsubscribe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          preferenceId: mockPreferenceId,
          notificationType: NotificationType.GENERAL,
          channel: NotificationChannel.EMAIL,
          reason: 'Too many emails',
        }),
      });
    });

    it('should throw error if already unsubscribed', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
      };

      const unsubscribeDto = {
        notificationType: NotificationType.GENERAL,
      };

      const existingUnsubscribe = {
        id: 'unsub-existing',
        preferenceId: mockPreferenceId,
        resubscribedAt: null,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.notificationUnsubscribe.findFirst as jest.Mock).mockResolvedValue(existingUnsubscribe);

      await expect(
        service.unsubscribe(mockUserProfileId, unsubscribeDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resubscribe', () => {
    it('should resubscribe successfully with valid token', async () => {
      const mockToken = 'valid-token';
      const mockUnsubscribe = {
        id: 'unsub-123',
        token: mockToken,
        resubscribedAt: null,
      };

      const mockUpdatedUnsubscribe = {
        ...mockUnsubscribe,
        resubscribedAt: new Date(),
      };

      (prisma.notificationUnsubscribe.findUnique as jest.Mock).mockResolvedValue(mockUnsubscribe);
      (prisma.notificationUnsubscribe.update as jest.Mock).mockResolvedValue(mockUpdatedUnsubscribe);

      const result = await service.resubscribe(mockToken);

      expect(result).toEqual(mockUpdatedUnsubscribe);
      expect(prisma.notificationUnsubscribe.update).toHaveBeenCalledWith({
        where: { id: 'unsub-123' },
        data: { resubscribedAt: expect.any(Date) },
      });
    });

    it('should throw error with invalid token', async () => {
      const mockToken = 'invalid-token';

      (prisma.notificationUnsubscribe.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resubscribe(mockToken)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if already resubscribed', async () => {
      const mockToken = 'valid-token';
      const mockUnsubscribe = {
        id: 'unsub-123',
        token: mockToken,
        resubscribedAt: new Date(),
      };

      (prisma.notificationUnsubscribe.findUnique as jest.Mock).mockResolvedValue(mockUnsubscribe);

      await expect(service.resubscribe(mockToken)).rejects.toThrow(BadRequestException);
    });
  });

  describe('trackNotificationSent', () => {
    it('should track notification frequency for both hourly and daily windows', async () => {
      const mockPreferences = {
        id: mockPreferenceId,
        userProfileId: mockUserProfileId,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.notificationFrequencyTracking.upsert as jest.Mock).mockResolvedValue({});

      await service.trackNotificationSent(mockUserProfileId, NotificationType.GENERAL);

      expect(prisma.notificationFrequencyTracking.upsert).toHaveBeenCalledTimes(2);
      
      // Check hourly tracking
      expect(prisma.notificationFrequencyTracking.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            preferenceId_notificationType_windowType_windowStart: expect.objectContaining({
              preferenceId: mockPreferenceId,
              notificationType: NotificationType.GENERAL,
              windowType: 'hourly',
            }),
          }),
        })
      );

      // Check daily tracking
      expect(prisma.notificationFrequencyTracking.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            preferenceId_notificationType_windowType_windowStart: expect.objectContaining({
              preferenceId: mockPreferenceId,
              notificationType: NotificationType.GENERAL,
              windowType: 'daily',
            }),
          }),
        })
      );
    });
  });

  describe('cleanupOldFrequencyTracking', () => {
    it('should delete old frequency tracking records', async () => {
      const mockDeleteResult = { count: 42 };

      (prisma.notificationFrequencyTracking.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await service.cleanupOldFrequencyTracking(7);

      expect(result).toBe(42);
      expect(prisma.notificationFrequencyTracking.deleteMany).toHaveBeenCalledWith({
        where: {
          windowStart: { lt: expect.any(Date) },
        },
      });
    });
  });
});