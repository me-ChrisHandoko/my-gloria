import { Test, TestingModule } from '@nestjs/testing';
import { ClerkWebhookService } from './clerk-webhook.service';

describe('ClerkWebhookService', () => {
  let service: ClerkWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClerkWebhookService],
    }).compile();

    service = module.get<ClerkWebhookService>(ClerkWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
