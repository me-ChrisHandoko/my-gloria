/**
 * UUID v7 utility for generating time-ordered UUIDs
 * Used across the application for consistent ID generation
 */

import { v7 as uuidv7 } from 'uuid';

/**
 * Generate a new UUID v7
 * UUID v7 provides:
 * - Time-ordering capability
 * - Better database index performance
 * - Embedded timestamp information
 * - Same uniqueness guarantees as UUID v4
 */
export function generateId(): string {
  return uuidv7();
}

/**
 * Validate if a string is a valid UUID
 * @param id - The string to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Extract timestamp from UUID v7
 * @param uuid - UUID v7 string
 * @returns Date object or null if not a valid UUID v7
 */
export function extractTimestampFromUuidV7(uuid: string): Date | null {
  if (!isValidUuid(uuid)) {
    return null;
  }

  try {
    // UUID v7 has timestamp in the first 48 bits
    const timestampHex = uuid.substring(0, 8) + uuid.substring(9, 13);
    const timestamp = parseInt(timestampHex, 16);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Compare two UUID v7s by their timestamp
 * @param uuid1 - First UUID v7
 * @param uuid2 - Second UUID v7
 * @returns -1 if uuid1 is older, 1 if uuid1 is newer, 0 if equal
 */
export function compareUuidV7(uuid1: string, uuid2: string): number {
  const time1 = extractTimestampFromUuidV7(uuid1);
  const time2 = extractTimestampFromUuidV7(uuid2);

  if (!time1 || !time2) {
    return 0;
  }

  return time1.getTime() - time2.getTime();
}
