import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RLS Helper Service
 *
 * Provides utility functions for working with Row Level Security,
 * including context management, policy testing, and debugging.
 */
@Injectable()
export class RLSHelperService {
  private readonly logger = new Logger(RLSHelperService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Test RLS policies for a specific user
   * @param clerkUserId The user to test
   * @param tableName The table to test access on
   * @returns Test results showing what the user can access
   */
  async testUserAccess(
    clerkUserId: string,
    tableName: string,
  ): Promise<{
    canSelect: boolean;
    canInsert: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    sampleData?: any[];
    error?: string;
  }> {
    try {
      // Get user context
      const userContext = await this.getUserContextForTesting(clerkUserId);

      // Set context and test each operation
      const results = await this.prisma.withRLSContext(
        userContext,
        async () => {
          const canSelect = await this.testSelect(tableName);
          const canInsert = await this.testInsert(tableName);
          const canUpdate = await this.testUpdate(tableName);
          const canDelete = await this.testDelete(tableName);

          // Get sample data if select is allowed
          let sampleData: any[] = [];
          if (canSelect) {
            sampleData = await this.getSampleData(tableName);
          }

          return {
            canSelect,
            canInsert,
            canUpdate,
            canDelete,
            sampleData,
          };
        },
      );

      return results;
    } catch (error: any) {
      this.logger.error(`RLS test failed for user ${clerkUserId}:`, error);
      return {
        canSelect: false,
        canInsert: false,
        canUpdate: false,
        canDelete: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user context for testing (simplified version)
   */
  private async getUserContextForTesting(clerkUserId: string): Promise<any> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const schoolIds = new Set<string>();
    const departmentIds = new Set<string>();

    userProfile.positions.forEach((up) => {
      if (up.position.schoolId) schoolIds.add(up.position.schoolId);
      if (up.position.departmentId) departmentIds.add(up.position.departmentId);
    });

    return {
      userProfileId: userProfile.id,
      clerkUserId: userProfile.clerkUserId,
      isSuperadmin: userProfile.isSuperadmin,
      schoolIds: Array.from(schoolIds),
      departmentIds: Array.from(departmentIds),
      permissionScopes: new Map(), // Simplified for testing
    };
  }

  /**
   * Test SELECT permission
   */
  private async testSelect(tableName: string): Promise<boolean> {
    try {
      const query = `SELECT COUNT(*) FROM gloria_ops.${tableName} LIMIT 1`;
      await this.prisma.$queryRawUnsafe(query);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test INSERT permission (dry run)
   */
  private async testInsert(tableName: string): Promise<boolean> {
    try {
      // This is a dry run - we rollback the transaction
      await this.prisma.$transaction(async (tx) => {
        const query = `SELECT has_table_privilege(current_user, 'gloria_ops.${tableName}', 'INSERT')`;
        const result = await tx.$queryRawUnsafe<any[]>(query);
        throw new Error('Rollback'); // Always rollback
      });
      return false;
    } catch (error: any) {
      return error.message !== 'Rollback';
    }
  }

  /**
   * Test UPDATE permission
   */
  private async testUpdate(tableName: string): Promise<boolean> {
    try {
      const query = `SELECT has_table_privilege(current_user, 'gloria_ops.${tableName}', 'UPDATE')`;
      const result = await this.prisma.$queryRawUnsafe<any[]>(query);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test DELETE permission
   */
  private async testDelete(tableName: string): Promise<boolean> {
    try {
      const query = `SELECT has_table_privilege(current_user, 'gloria_ops.${tableName}', 'DELETE')`;
      const result = await this.prisma.$queryRawUnsafe<any[]>(query);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get sample data from table
   */
  private async getSampleData(tableName: string): Promise<any[]> {
    try {
      const query = `SELECT * FROM gloria_ops.${tableName} LIMIT 5`;
      const result = await this.prisma.$queryRawUnsafe(query);
      return result as any[];
    } catch {
      return [];
    }
  }

  /**
   * Enable RLS on a table (admin only)
   */
  async enableRLS(tableName: string): Promise<boolean> {
    try {
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE gloria_ops.${tableName} ENABLE ROW LEVEL SECURITY`,
      );
      this.logger.log(`RLS enabled on table: ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to enable RLS on ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Disable RLS on a table (admin only)
   */
  async disableRLS(tableName: string): Promise<boolean> {
    try {
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE gloria_ops.${tableName} DISABLE ROW LEVEL SECURITY`,
      );
      this.logger.log(`RLS disabled on table: ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to disable RLS on ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Check if RLS is enabled on a table
   */
  async isRLSEnabled(tableName: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${tableName}
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
      `;
      return result[0]?.relrowsecurity || false;
    } catch {
      return false;
    }
  }

  /**
   * List all policies for a table
   */
  async listPolicies(tableName: string): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          polname as name,
          CASE polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
          END as command,
          pg_get_expr(polqual, polrelid) as using_expression,
          pg_get_expr(polwithcheck, polrelid) as check_expression
        FROM pg_policy
        WHERE polrelid = (
          SELECT oid FROM pg_class 
          WHERE relname = ${tableName}
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        )
      `;
      return result;
    } catch (error) {
      this.logger.error(`Failed to list policies for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Validate RLS setup
   * Checks if all required functions and policies are in place
   */
  async validateRLSSetup(): Promise<{
    isValid: boolean;
    functions: string[];
    missingFunctions: string[];
    tablesWithRLS: string[];
    tablesWithoutRLS: string[];
  }> {
    const requiredFunctions = [
      'current_user_context',
      'is_superadmin',
      'user_school_ids',
      'user_department_ids',
      'current_user_profile_id',
      'get_permission_scope',
    ];

    const requiredTables = [
      'schools',
      'departments',
      'positions',
      'user_positions',
      'user_profiles',
      'requests',
      'notifications',
    ];

    // Check functions
    const existingFunctions = await this.prisma.$queryRaw<any[]>`
      SELECT proname 
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
      AND proname = ANY(${requiredFunctions})
    `;

    const foundFunctions = existingFunctions.map((f) => f.proname);
    const missingFunctions = requiredFunctions.filter(
      (f) => !foundFunctions.includes(f),
    );

    // Check RLS on tables
    const tablesWithRLS: string[] = [];
    const tablesWithoutRLS: string[] = [];

    for (const table of requiredTables) {
      const isEnabled = await this.isRLSEnabled(table);
      if (isEnabled) {
        tablesWithRLS.push(table);
      } else {
        tablesWithoutRLS.push(table);
      }
    }

    return {
      isValid: missingFunctions.length === 0 && tablesWithoutRLS.length === 0,
      functions: foundFunctions,
      missingFunctions,
      tablesWithRLS,
      tablesWithoutRLS,
    };
  }

  /**
   * Get RLS statistics for monitoring
   */
  async getRLSStatistics(): Promise<{
    totalQueries: number;
    rlsFilteredQueries: number;
    bypassedQueries: number;
    averageFilterTime: number;
  }> {
    // This would typically integrate with your monitoring system
    // For now, return mock data
    return {
      totalQueries: 0,
      rlsFilteredQueries: 0,
      bypassedQueries: 0,
      averageFilterTime: 0,
    };
  }
}
