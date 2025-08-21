import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RoleSwitchingController } from './controllers/role-switching.controller';
import { AdminImpersonationController } from './controllers/admin-impersonation.controller';
import { RoleSwitchingService } from './services/role-switching.service';
import { ClerkService } from './services/clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkWebhookGuard } from './guards/clerk-webhook.guard';
import { RowLevelSecurityService } from '../security/row-level-security.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [
    AuthController,
    RoleSwitchingController,
    AdminImpersonationController,
  ],
  providers: [
    AuthService,
    RoleSwitchingService,
    ClerkService,
    RowLevelSecurityService,
    ClerkAuthGuard,
    ClerkWebhookGuard,
  ],
  exports: [
    AuthService,
    RoleSwitchingService,
    ClerkService,
    ClerkAuthGuard,
    ClerkWebhookGuard,
  ],
})
export class AuthModule {}
