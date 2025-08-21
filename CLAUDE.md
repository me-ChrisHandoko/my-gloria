# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YPK Gloria Internal Management System - A comprehensive organizational management platform built with Next.js 15 (frontend) and NestJS (backend), using Clerk for authentication and PostgreSQL with Prisma ORM for data persistence.

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run start            # Start production server
```

### Backend (NestJS)
```bash
cd backend
npm install              # Install dependencies
npm run start:dev        # Start development server with watch mode (http://localhost:3001)
npm run build            # Build for production
npm run start:prod       # Start production server
npm run lint             # Run ESLint
npm run test             # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Generate test coverage report
```

### Database Commands (Backend)
```bash
# Prisma/Database operations
npm run db:migrate:dev   # Run migrations in development
npm run db:migrate       # Deploy migrations to production
npm run db:seed          # Seed permissions data
npm run db:setup         # Run migrations and seed data

# Row-Level Security (RLS) operations
npm run rls:setup        # Setup RLS
npm run rls:enable       # Enable RLS
npm run rls:disable      # Disable RLS
npm run rls:status       # Check RLS status
npm run rls:validate     # Validate RLS configuration
```

## Architecture Overview

### Frontend Structure
- **Framework**: Next.js 15 with App Router
- **State Management**: Redux Toolkit with RTK Query for API calls
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **Authentication**: Clerk integration with custom providers
- **Key Directories**:
  - `/src/app/(authenticated)/` - Protected routes requiring authentication
  - `/src/components/` - Reusable UI components
  - `/src/store/api/` - RTK Query API slices
  - `/src/types/` - TypeScript type definitions
  - `/src/lib/` - Utility functions and helpers
  - `/src/hooks/` - Custom React hooks
  - `/src/contexts/` - React Context providers

### Backend Structure
- **Framework**: NestJS with Fastify adapter
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk webhook integration
- **Security**: Row-Level Security (RLS) implementation
- **Key Directories**:
  - `/src/modules/organization/` - Organizational structure (schools, departments, positions)
  - `/src/auth/` - Authentication guards and services
  - `/src/security/` - RLS and security implementations
  - `/src/prisma/` - Database service and migrations
  - `/src/common/` - Shared utilities, decorators, and filters
  - `/src/audit/` - Audit logging service

### Database Schema
- **Multi-schema**: `gloria_master` (existing data) and `gloria_ops` (operational data)
- **Key Tables**:
  - `data_karyawan` - Existing employee data (read-only)
  - `user_profiles` - Links Clerk users to employee data
  - `schools`, `departments`, `positions` - Organizational hierarchy
  - `roles`, `permissions` - RBAC system
  - `audit_logs` - Comprehensive audit trail

## Authentication Flow

1. **Frontend**: Uses Clerk's React components for sign-in
2. **API Calls**: Include Clerk JWT token in Authorization header
3. **Backend**: Validates token using ClerkAuthGuard
4. **RLS**: Applies row-level security based on user context

## Mock Data System

The frontend includes a mock data system for development:
- Toggle mock data using the development toolbar (bottom-right in dev mode)
- Mock data is stored in `/src/lib/mock-data/`
- Controlled via `localStorage` key `USE_MOCK_DATA`

## Key Features

### Organization Management
- **Hierarchy Visualization**: Tree view of organizational structure
- **CRUD Operations**: Manage schools, departments, positions
- **User Position Assignment**: Link users to positions with date ranges

### Permission System
- **Role-Based Access Control (RBAC)**: Hierarchical roles with permissions
- **Module Access Control**: Grant/restrict access to specific modules
- **Permission Caching**: Optimized permission checking with cache

### Audit System
- Comprehensive audit logging for all data modifications
- Tracks actor, action, entity type, and changes
- Searchable audit trail with filtering

## API Integration

### Frontend API Calls
All API calls use RTK Query with custom base query:
- Base URL: `http://localhost:3001/api` (configurable via `NEXT_PUBLIC_API_URL`)
- Authentication: Automatic token injection via `clerkBaseQueryV3`
- Mock data fallback for development

### Backend API Structure
- RESTful endpoints with `/api/v1` prefix
- Swagger documentation available at `/api/docs`
- Request validation using class-validator
- Response transformation with interceptors

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/database
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
PORT=3001
```

## Testing

### Frontend Testing
- Component testing with React Testing Library
- E2E testing with Playwright (when configured)
- Mock API responses for isolated testing

### Backend Testing
- Unit tests with Jest
- E2E tests for API endpoints
- RLS validation tests
- Test database isolation

## Common Development Tasks

### Adding a New API Endpoint
1. Backend: Create controller and service in appropriate module
2. Backend: Add DTOs for request/response validation
3. Frontend: Add endpoint to RTK Query API slice
4. Frontend: Add TypeScript types in `/src/types/`
5. Frontend: Use generated hooks in components

### Adding a New Page
1. Create route in `/src/app/(authenticated)/`
2. Implement page component with data fetching
3. Add navigation link in sidebar/menu
4. Configure permissions if needed

### Modifying Database Schema
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate:dev` to generate migration
3. Update DTOs and types accordingly
4. Test RLS policies if applicable

## Code Style Guidelines

- **TypeScript**: Strict mode enabled, prefer interfaces over types
- **React**: Functional components with hooks
- **State Management**: Use RTK Query for server state, Redux for client state
- **Styling**: Tailwind CSS utility classes, avoid inline styles
- **Error Handling**: Use toast notifications for user feedback
- **Forms**: React Hook Form with Zod validation

## Performance Considerations

- **Frontend**: 
  - Use React.memo for expensive components
  - Implement virtual scrolling for large lists
  - Lazy load routes and components
  - Cache API responses with RTK Query

- **Backend**:
  - Use database indexes for frequent queries
  - Implement pagination for list endpoints
  - Cache permission checks
  - Use connection pooling for database

## Security Best Practices

- All routes require authentication by default
- Row-Level Security enforced at database level
- Input validation on both frontend and backend
- CORS configured for specific origins
- Rate limiting on API endpoints
- Audit logging for sensitive operations