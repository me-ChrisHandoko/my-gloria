import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  IPolicyEvaluator,
  PolicyContext,
  PolicyEvaluationResult,
  LocationBasedRule,
} from '../interfaces/policy-evaluator.interface';

@Injectable()
export class LocationBasedPolicyEngine implements IPolicyEvaluator {
  type = PolicyType.LOCATION_BASED;

  async evaluate(
    rules: LocationBasedRule,
    context: PolicyContext,
  ): Promise<PolicyEvaluationResult> {
    if (!context.location) {
      return {
        isApplicable: false,
        grantedPermissions: [],
        reason: 'Location information not provided',
      };
    }

    let isAllowed = true;
    const reasons: string[] = [];

    // Check denied locations first (deny takes precedence)
    if (rules.deniedLocations?.length) {
      for (const deniedLocation of rules.deniedLocations) {
        if (this.isLocationMatch(deniedLocation, context.location)) {
          isAllowed = false;
          reasons.push(
            `Access denied from ${deniedLocation.type}: ${JSON.stringify(deniedLocation.value)}`,
          );
          break;
        }
      }
    }

    // Check allowed locations only if not denied
    if (isAllowed && rules.allowedLocations?.length) {
      isAllowed = false; // Reset to false, must match at least one allowed location

      for (const allowedLocation of rules.allowedLocations) {
        if (this.isLocationMatch(allowedLocation, context.location)) {
          isAllowed = true;
          break;
        }
      }

      if (!isAllowed) {
        reasons.push('Location not in allowed list');
      }
    }

    return {
      isApplicable: isAllowed,
      grantedPermissions: [],
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      metadata: {
        evaluatedLocation: context.location,
        timestamp: new Date(),
      },
    };
  }

  validate(rules: any): boolean {
    if (!rules || typeof rules !== 'object') {
      return false;
    }

    const locationRule = rules as LocationBasedRule;

    // Validate allowed locations
    if (locationRule.allowedLocations) {
      if (!Array.isArray(locationRule.allowedLocations)) {
        return false;
      }

      for (const location of locationRule.allowedLocations) {
        if (!this.isValidLocationRule(location)) {
          return false;
        }
      }
    }

    // Validate denied locations
    if (locationRule.deniedLocations) {
      if (!Array.isArray(locationRule.deniedLocations)) {
        return false;
      }

      for (const location of locationRule.deniedLocations) {
        if (!this.isValidLocationRule(location)) {
          return false;
        }
      }
    }

    return true;
  }

  private isLocationMatch(
    rule: { type: string; value: any },
    userLocation: PolicyContext['location'],
  ): boolean {
    if (!userLocation) {
      return false;
    }

    switch (rule.type) {
      case 'ip':
        return this.isIpMatch(rule.value as string, userLocation.ipAddress);

      case 'country':
        return (
          userLocation.country?.toLowerCase() ===
          (rule.value as string).toLowerCase()
        );

      case 'city':
        return (
          userLocation.city?.toLowerCase() ===
          (rule.value as string).toLowerCase()
        );

      case 'coordinates':
        if (!userLocation.coordinates) {
          return false;
        }
        const coordRule = rule.value as {
          latitude: number;
          longitude: number;
          radius: number;
        };
        return this.isWithinRadius(
          userLocation.coordinates,
          { latitude: coordRule.latitude, longitude: coordRule.longitude },
          coordRule.radius,
        );

      default:
        return false;
    }
  }

  private isIpMatch(ruleIp: string, userIp?: string): boolean {
    if (!userIp) {
      return false;
    }

    // Support CIDR notation
    if (ruleIp.includes('/')) {
      return this.isIpInCidr(userIp, ruleIp);
    }

    // Support wildcards
    if (ruleIp.includes('*')) {
      const regex = new RegExp(
        '^' + ruleIp.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
      );
      return regex.test(userIp);
    }

    // Exact match
    return ruleIp === userIp;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    // Simplified CIDR matching for IPv4
    const [network, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);

    return (ipNum & mask) === (networkNum & mask);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }

  private isWithinRadius(
    userCoords: { latitude: number; longitude: number },
    centerCoords: { latitude: number; longitude: number },
    radiusKm: number,
  ): boolean {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(userCoords.latitude - centerCoords.latitude);
    const dLon = this.toRad(userCoords.longitude - centerCoords.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(centerCoords.latitude)) *
        Math.cos(this.toRad(userCoords.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusKm;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isValidLocationRule(location: any): boolean {
    if (!location || typeof location !== 'object') {
      return false;
    }

    if (!['ip', 'country', 'city', 'coordinates'].includes(location.type)) {
      return false;
    }

    if (location.type === 'coordinates') {
      const coords = location.value;
      if (!coords || typeof coords !== 'object') {
        return false;
      }

      if (
        typeof coords.latitude !== 'number' ||
        typeof coords.longitude !== 'number' ||
        typeof coords.radius !== 'number'
      ) {
        return false;
      }

      if (
        coords.latitude < -90 ||
        coords.latitude > 90 ||
        coords.longitude < -180 ||
        coords.longitude > 180 ||
        coords.radius <= 0
      ) {
        return false;
      }
    } else {
      if (typeof location.value !== 'string') {
        return false;
      }
    }

    return true;
  }
}
