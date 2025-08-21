import { Module, forwardRef } from '@nestjs/common';
import { UserProfileController } from './controllers/user-profile.controller';
import { ClerkWebhookController } from './controllers/clerk-webhook.controller';
import { UserProfileService } from './services/user-profile.service';
import { ClerkWebhookService } from './services/clerk-webhook.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [UserProfileController, ClerkWebhookController],
  providers: [UserProfileService, ClerkWebhookService],
  exports: [UserProfileService, ClerkWebhookService],
})
export class UserProfileModule {}
