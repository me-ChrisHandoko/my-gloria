# User Impersonation Feature - Frontend Implementation

## Date: 2025-08-19

## 🎯 Overview

Complete implementation of user impersonation feature for superadmins with all recommended UI/UX enhancements. This feature allows authorized superadmins to temporarily impersonate other users for debugging and support purposes.

## ✅ Features Implemented

### 1. **Visual Indicators**
- **Yellow Warning Banner**: Prominent banner at the top of the page when impersonation is active
- **Gradient Background**: Yellow-to-amber gradient that turns red when session is expiring
- **Pulsing Top Border**: 3px animated border for additional visual indication
- **Body Class**: `impersonation-active` class added to body for global styling

### 2. **Quick Access Dropdown**
- **Navbar Integration**: Dropdown in the page header for superadmin users
- **User Search**: Real-time search functionality to find users by name or email
- **User Preview**: Shows user avatar, name, email, and role
- **Confirmation Dialog**: Requires confirmation before starting impersonation
- **Reason Field**: Optional field to document reason for impersonation

### 3. **Session Timer Display**
- **Real-time Countdown**: Shows remaining time in minutes and seconds
- **Color Coding**: Normal (yellow) vs Expiring Soon (red) states
- **Auto-refresh**: Automatically refreshes session when <10 minutes remaining
- **Warning State**: Visual warnings when <5 minutes remaining

### 4. **Clear Exit Options**
- **Stop Button**: Prominent "Stop Impersonation" button in the banner
- **Refresh Button**: Manual session refresh to extend time
- **Confirmation**: Requires confirmation before stopping impersonation

### 5. **Permission Display**
- **Original User Display**: Shows who initiated the impersonation
- **Target User Display**: Shows who is being impersonated
- **Role Badges**: Visual indication of user roles
- **Superadmin Badge**: Special indicator for christian_handoko@gloriaschool.org

## 📁 Files Created

### API Layer
- `/src/store/api/impersonationApi.ts` - RTK Query API endpoints for impersonation

### Components
- `/src/components/impersonation/ImpersonationBanner.tsx` - Warning banner component
- `/src/components/impersonation/ImpersonationDropdown.tsx` - User selection dropdown

### Context & Hooks
- `/src/contexts/ImpersonationContext.tsx` - Global impersonation state management
- `/src/hooks/useIsSuperAdmin.ts` - Hook to check superadmin status

### Styles
- Updated `/src/app/globals.css` - Added impersonation mode styles

## 📦 Components

### ImpersonationBanner
```typescript
// Features:
- Real-time countdown timer
- Auto-refresh when <10 minutes remaining
- Color changes based on time remaining
- Session refresh button
- Stop impersonation button
- Shows original and impersonated users
```

### ImpersonationDropdown
```typescript
// Features:
- User search with debouncing
- Avatar and role display
- Confirmation dialog
- Reason documentation
- Only visible to superadmins
```

### ImpersonationContext
```typescript
// Provides:
- Global impersonation state
- Session information
- Remaining time tracking
- Auto-expiry handling
- Body class management
```

## 🔄 Session Management

### Session Duration
- **Default**: 1 hour (3600 seconds)
- **Auto-refresh**: When <10 minutes remaining
- **Manual refresh**: Available anytime via button
- **Auto-expire**: Reloads page when session expires

### API Endpoints
```typescript
GET  /v1/admin/impersonation/session    // Get current session
GET  /v1/admin/impersonation/users      // Get impersonatable users
POST /v1/admin/impersonation/start      // Start impersonation
POST /v1/admin/impersonation/stop       // Stop impersonation
POST /v1/admin/impersonation/refresh    // Refresh session
```

### State Management
- RTK Query for API calls with caching
- Context API for global state
- Polling every 30 seconds for session updates
- Real-time countdown with 1-second intervals

## 🎨 UI/UX Features

### Visual Hierarchy
1. **Top Banner** - Most prominent, fixed position
2. **Navbar Dropdown** - Easy access for starting
3. **Timer Display** - Always visible countdown
4. **Action Buttons** - Clear CTA for stop/refresh

### Color Scheme
- **Normal State**: Yellow/Amber gradient (#f59e0b → #eab308)
- **Expiring State**: Red/Orange gradient (#ef4444 → #f97316)
- **Timer Badge**: White on colored background
- **Buttons**: Destructive red for stop, secondary for refresh

### Animations
- **Banner Pulse**: Subtle pulse animation on warning border
- **Timer Pulse**: Animated when expiring soon
- **Refresh Spin**: Loading spinner on refresh button
- **Fade In**: Smooth transitions for all components

## 🔐 Security Features

### Authorization
- Only superadmin emails can access impersonation
- Email whitelist: `christian_handoko@gloriaschool.org`
- Server-side validation of permissions

### Audit Trail
- Reason field for documentation
- Original user always tracked
- All actions logged server-side
- Session-based with secure cookies

### Safety Measures
- Confirmation required for start/stop
- Visual warnings throughout
- Auto-expiry after 1 hour
- Clear indication of impersonation mode

## 🧪 Testing Instructions

### For Superadmin (christian_handoko@gloriaschool.org)

1. **Start Impersonation**:
   - Click "Impersonate" button in navbar
   - Search for a user
   - Select user and confirm
   - Optionally add reason

2. **During Impersonation**:
   - Yellow banner appears at top
   - Timer counts down from 60:00
   - Original and target users displayed
   - Refresh button extends session

3. **Warning State** (<5 minutes):
   - Banner turns red
   - Timer pulses
   - Warning message appears

4. **Stop Impersonation**:
   - Click "Stop Impersonation"
   - Confirm action
   - Page reloads to original session

### For Regular Users
- No impersonation features visible
- Normal application behavior
- No access to admin endpoints

## 🚀 Usage

### Starting Impersonation
```typescript
// Dropdown automatically appears for superadmins
// Search and select user
// Confirm with optional reason
```

### During Impersonation
```typescript
// Banner shows:
- "Impersonation Mode Active"
- Original: christian_handoko@gloriaschool.org
- Impersonating: [target user]
- Timer: XXm XXs
- [Refresh] [Stop Impersonation]
```

### Stopping Impersonation
```typescript
// Click "Stop Impersonation"
// Confirm dialog
// Automatic page reload
```

## 📝 Notes

### Performance
- Efficient polling with 30-second intervals
- Minimal re-renders with memoization
- Lazy loading of user lists
- Debounced search input

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- High contrast colors for warnings

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Secure cookie support required
- WebSocket optional for real-time updates

## ⚡ Quick Reference

### Superadmin Emails
```typescript
const SUPERADMIN_EMAILS = [
  'christian_handoko@gloriaschool.org',
];
```

### Session Timing
- Duration: 1 hour
- Auto-refresh: <10 minutes
- Warning: <5 minutes
- Polling: 30 seconds

### Visual States
- Normal: Yellow banner
- Expiring: Red banner
- Active: Body padding adjustment
- Inactive: No visual changes

## 🔧 Configuration

### To Add More Superadmins
Edit `/src/hooks/useIsSuperAdmin.ts`:
```typescript
const SUPERADMIN_EMAILS = [
  'christian_handoko@gloriaschool.org',
  'new_admin@gloriaschool.org', // Add here
];
```

### To Adjust Session Duration
Backend configuration required (not in frontend)

### To Customize Visual Style
Edit banner colors in:
- `/src/components/impersonation/ImpersonationBanner.tsx`
- `/src/app/globals.css`

## ✅ Implementation Complete

All requested features have been successfully implemented:
- ✅ Visual indicator (yellow banner)
- ✅ Quick access dropdown for superadmin
- ✅ Timer display with countdown
- ✅ Clear exit button
- ✅ Permission display
- ✅ Session management with auto-refresh
- ✅ Graceful session expiry handling
- ✅ Testing ready for christian_handoko@gloriaschool.org