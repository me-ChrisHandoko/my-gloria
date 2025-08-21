import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RoleSwitchingController } from './controllers/role-switching.controller';
import { AdminImpersonationController } from './controllers/admin-impersonation.controller';
import { RoleSwitchingService } from './services/role-switching.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkWebhookGuard } from './guards/clerk-webhook.guard';
import { RowLevelSecurityService } from '../security/row-level-security.service';

@Global()
@Module({
  controllers: [
    AuthController,
    RoleSwitchingController,
    AdminImpersonationController,
  ],
  providers: [
    AuthService,
    RoleSwitchingService,
    RowLevelSecurityService,
    ClerkAuthGuard,
    ClerkWebhookGuard,
  ],
  exports: [
    AuthService,
    RoleSwitchingService,
    ClerkAuthGuard,
    ClerkWebhookGuard,
  ],
})
export class AuthModule {}
