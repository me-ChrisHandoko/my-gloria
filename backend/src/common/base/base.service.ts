/**
 * Base service class that provides common functionality for all services
 * Includes UUID v7 generation for create operations
 */

import { generateId } from '../utils/uuid.util';

export abstract class BaseService {
  /**
   * Generate a new UUID v7 for ID fields
   * @returns UUID v7 string
   */
  protected generateId(): string {
    return generateId();
  }

  /**
   * Add UUID v7 to create data if id is not provided
   * @param data - The data object for creation
   * @returns Data with id field
   */
  protected addIdToCreateData<T extends { id?: string }>(
    data: T,
  ): T & { id: string } {
    return {
      ...data,
      id: data.id || this.generateId(),
    };
  }

  /**
   * Add UUID v7 to multiple create data objects
   * @param dataArray - Array of data objects for creation
   * @returns Array with id fields added
   */
  protected addIdToCreateManyData<T extends { id?: string }>(
    dataArray: T[],
  ): (T & { id: string })[] {
    return dataArray.map((data) => this.addIdToCreateData(data));
  }

  /**
   * Prepare data for Prisma create operation with UUID v7
   * @param data - Raw data for creation
   * @param additionalFields - Additional fields to add
   * @returns Prepared data with id
   */
  protected prepareCreateData<T extends Record<string, any>>(
    data: T,
    additionalFields?: Record<string, any>,
  ): T & { id: string } {
    return {
      id: this.generateId(),
      ...data,
      ...additionalFields,
    };
  }
}
