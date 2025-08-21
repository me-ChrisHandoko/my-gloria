# User Profile Module Implementation Note

## Current Schema vs. Proposed Implementation

### Issue
The existing Prisma schema has a different structure than what was proposed in the NEW_MODULES.md document:

#### Existing Schema (Current)
```prisma
model UserProfile {
  id            String   @id
  clerkUserId   String   @unique @map("clerk_user_id")
  nip           String   @unique @map("nip") // REQUIRED field
  dataKaryawan  DataKaryawan @relation(fields: [nip], references: [nip])
  // ... other fields
}
```

- UserProfile REQUIRES a `nip` (employee ID from DataKaryawan)
- One-to-one relationship with DataKaryawan
- Cannot exist without an employee record

#### Proposed Implementation (NEW_MODULES.md)
- UserProfile can be created independently
- Optional link to DataKaryawan via `employeeId`
- Supports users who are not employees

## Decision Required

### Option 1: Modify Schema (Recommended)
Update the Prisma schema to make the employee link optional:

```prisma
model UserProfile {
  id            String   @id @default(uuid())
  clerkUserId   String   @unique @map("clerk_user_id")
  nip           String?  @unique @map("nip") // Make OPTIONAL
  dataKaryawan  DataKaryawan? @relation(fields: [nip], references: [nip])
  
  // Additional profile fields
  email         String   @unique
  fullName      String?
  phoneNumber   String?
  profilePictureUrl String?
  dateOfBirth   DateTime?
  address       String?
  city          String?
  province      String?
  postalCode    String?
  bio           String?
  isVerified    Boolean  @default(false)
  lastLoginAt   DateTime?
  
  // ... existing relations
}
```

### Option 2: Keep Current Schema
- Only employees can have UserProfiles
- Create UserProfile only after matching with DataKaryawan
- Non-employee users cannot access the system

### Option 3: Dual Model Approach
- Keep UserProfile for employees (linked to DataKaryawan)
- Create new ExternalUserProfile for non-employees
- Manage both types separately

## Current Implementation Status

The User Profile Module has been implemented based on the proposed design (Option 1), but it conflicts with the existing schema. The implementation includes:

1. ✅ UserProfileController with CRUD operations
2. ✅ UserProfileService with Clerk integration
3. ✅ ClerkWebhookService for handling Clerk events
4. ✅ DTOs for create, update, and response
5. ✅ Module configuration and exports

## Next Steps

1. **Decision**: Choose which approach to take
2. **Schema Migration**: If Option 1, create a migration to update the schema
3. **Code Adjustment**: Align the implementation with the chosen approach
4. **Testing**: Verify the implementation works correctly

## Files Created/Modified

### New Files
- `/src/modules/user-profile/` - Complete module structure
- `/src/auth/interfaces/clerk-user.interface.ts` - ClerkUser interface
- `/src/auth/services/clerk.service.ts` - Clerk service for API calls

### Modified Files
- `/src/auth/auth.module.ts` - Added ClerkService
- `/src/app.module.ts` - Added UserProfileModule

## Dependencies Added
- `svix` - For webhook signature verification
- `@clerk/backend` - For Clerk API integration