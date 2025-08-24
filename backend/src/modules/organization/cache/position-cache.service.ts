import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationCacheService } from './organization-cache.service';
import { Position } from '@prisma/client';

export interface CachedPosition extends Position {
  department?: any;
  school?: any;
  userPositions?: any[];
  _count?: any;
}

@Injectable()
export class PositionCacheService extends OrganizationCacheService<any> {
  constructor(eventEmitter: EventEmitter2) {
    super(eventEmitter);
  }

  /**
   * Get cached position with relations
   */
  async getPosition(positionId: string): Promise<CachedPosition | null> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'full');
    return this.get(key);
  }

  /**
   * Cache position with relations
   */
  async setPosition(positionId: string, position: CachedPosition): Promise<void> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'full');
    await this.set(key, position, {
      ttl: 5 * 60 * 1000, // 5 minutes
      invalidateOn: [
        `position.${positionId}.updated`,
        `position.${positionId}.deleted`,
        `department.${position.departmentId}.updated`,
        `school.${position.schoolId}.updated`,
      ],
    });
  }

  /**
   * Get cached position availability
   */
  async getAvailability(positionId: string): Promise<any | null> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'availability');
    return this.get(key);
  }

  /**
   * Cache position availability
   */
  async setAvailability(positionId: string, availability: any): Promise<void> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'availability');
    await this.set(key, availability, {
      ttl: 2 * 60 * 1000, // 2 minutes - shorter TTL for availability
      invalidateOn: [
        `position.${positionId}.updated`,
        `position.${positionId}.deleted`,
        `userPosition.${positionId}.created`,
        `userPosition.${positionId}.updated`,
        `userPosition.${positionId}.deleted`,
      ],
    });
  }

  /**
   * Get cached position hierarchy
   */
  async getHierarchy(positionId: string): Promise<any[] | null> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'hierarchy');
    return this.get(key);
  }

  /**
   * Cache position hierarchy
   */
  async setHierarchy(positionId: string, hierarchy: any[]): Promise<void> {
    const key = OrganizationCacheService.generateKey('position', positionId, 'hierarchy');
    await this.set(key, hierarchy, {
      ttl: 10 * 60 * 1000, // 10 minutes - longer TTL for hierarchy
      invalidateOn: [
        `positionHierarchy.${positionId}.updated`,
        `position.${positionId}.deleted`,
      ],
    });
  }

  /**
   * Get cached positions by department
   */
  async getByDepartment(departmentId: string): Promise<CachedPosition[] | null> {
    const key = OrganizationCacheService.generateKey('position', 'department', departmentId);
    return this.get(key);
  }

  /**
   * Cache positions by department
   */
  async setByDepartment(
    departmentId: string,
    positions: CachedPosition[],
  ): Promise<void> {
    const key = OrganizationCacheService.generateKey('position', 'department', departmentId);
    await this.set(key, positions, {
      ttl: 5 * 60 * 1000, // 5 minutes
      invalidateOn: [
        `department.${departmentId}.updated`,
        `department.${departmentId}.deleted`,
      ],
    });
  }

  /**
   * Invalidate all caches for a position
   */
  async invalidatePosition(positionId: string): Promise<void> {
    const patterns = [
      `position:${positionId}:*`,
      `position:department:*`, // Department listings might include this position
    ];

    for (const pattern of patterns) {
      await this.delete(pattern);
    }
  }

  /**
   * Warm up cache for frequently accessed positions
   */
  async warmUp(positionIds: string[]): Promise<void> {
    // This method would be called during application startup
    // or after cache clear to pre-populate frequently accessed data
    // Implementation would depend on the repository/service layer
  }
}