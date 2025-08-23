import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip maintenance check for system config endpoints
    if (req.path.includes('/system-config/maintenance')) {
      return next();
    }

    // Skip for health check endpoints
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    // Get user IP and roles from request
    const userIp = req.ip || req.headers['x-forwarded-for']?.toString();
    const userRoles = (req as any).user?.roles || [];

    // Check maintenance access
    const access = await this.maintenanceService.checkMaintenanceAccess(
      userIp,
      userRoles,
    );

    if (!access.allowed) {
      const maintenanceStatus =
        await this.maintenanceService.getMaintenanceStatus();

      res.status(503).json({
        statusCode: 503,
        message: access.message || 'System is under maintenance',
        estimatedEndTime: maintenanceStatus.estimatedEndTime,
        error: 'Service Unavailable',
      });
      return;
    }

    next();
  }
}
