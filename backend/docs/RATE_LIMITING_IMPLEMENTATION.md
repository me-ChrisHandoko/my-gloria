# Rate Limiting & Deduplication Implementation

## Overview
We have successfully implemented rate limiting and deduplication for the notification system to prevent spam and duplicate notifications.

## Implementation Details

### 1. Rate Limiting Service (`services/rate-limit.service.ts`)

#### Features:
- **Sliding Window Algorithm**: Tracks requests within a time window for accurate rate limiting
- **Per-Type Configuration**: Different rate limits for different notification types
- **Dynamic Configuration**: Rate limits can be updated at runtime
- **User-Specific Tracking**: Each user has independent rate limit counters

#### Default Rate Limits:
- `GENERAL`: 10 notifications per minute
- `APPROVAL_REQUEST`: 5 notifications per minute  
- `APPROVAL_RESULT`: 5 notifications per minute
- `DELEGATION`: 3 notifications per minute
- `CRITICAL`: 20 notifications per minute (higher for urgent notifications)
- Default fallback: 5 notifications per minute

#### Key Methods:
```typescript
// Check if rate limited
isRateLimited(userProfileId: string, notificationType: string): Promise<{
  limited: boolean;
  remaining: number;
  resetAt: Date;
}>

// Reset rate limit (admin function)
resetRateLimit(userProfileId: string, notificationType?: string): Promise<void>

// Get rate limit status
getRateLimitStatus(userProfileId: string): Promise<Map<string, RateLimitStatus>>
```

### 2. Deduplication System

#### Features:
- **Content-Based Hashing**: SHA-256 hash of user + title + message + data
- **5-Minute Window**: Prevents duplicate notifications within 5 minutes
- **Automatic Cleanup**: Expired hashes are automatically removed

#### How It Works:
1. Generates a unique hash for each notification based on content
2. Stores hash in Redis cache with 5-minute TTL
3. Checks for existing hash before creating new notification
4. Blocks duplicates and logs warnings

### 3. Input Sanitization Service (`services/sanitization.service.ts`)

#### Features:
- **HTML Sanitization**: Removes dangerous tags and scripts
- **Email Validation**: Validates and sanitizes email addresses
- **Text Sanitization**: Removes special characters and normalizes content
- **JSON Sanitization**: Recursively sanitizes nested data structures

#### Security Measures:
- Removes `<script>`, `<iframe>`, `<style>`, `<form>` tags
- Strips `on*` event attributes (onclick, onload, etc.)
- Blocks `javascript:`, `data:`, `vbscript:` protocols
- Escapes special HTML characters
- Validates email format
- Truncates overly long inputs

### 4. Integration with Notification Service

#### Create Notification Flow:
1. **Sanitize Input**: Clean title, message, and data
2. **Check Rate Limit**: Verify user hasn't exceeded limits
3. **Check Duplicates**: Ensure notification isn't a duplicate
4. **Create Notification**: Save to database if all checks pass
5. **Queue Additional Channels**: Send to email/push if needed

#### Bulk Notification Flow:
1. **Sanitize Input**: Clean all content
2. **Filter Recipients**: Check rate limits for each user
3. **Remove Duplicates**: Skip users with duplicate notifications
4. **Create Valid Notifications**: Only for users who pass all checks
5. **Log Statistics**: Track how many were rate-limited or duplicates

### 5. API Endpoints

#### New Endpoints Added:
```typescript
// Get rate limit status
GET /api/v1/notifications/rate-limit/status

// Reset rate limit (currently user can only reset their own)
POST /api/v1/notifications/rate-limit/reset
Body: {
  userProfileId: string;
  notificationType?: string; // Optional, resets all if not provided
}
```

### 6. Database Indexes

Created indexes for optimal query performance:
```sql
-- User and read status queries
CREATE INDEX idx_notification_user_read ON notifications(userProfileId, isRead);

-- Sorting by date and type
CREATE INDEX idx_notification_created_type ON notifications(createdAt DESC, type);

-- Priority queries for unread notifications
CREATE INDEX idx_notification_priority_unread ON notifications(priority) WHERE isRead = false;

-- Efficient unread count queries
CREATE INDEX idx_notification_user_unread_count ON notifications(userProfileId) WHERE isRead = false;

-- Complex queries with date ranges
CREATE INDEX idx_notification_user_date_type ON notifications(userProfileId, createdAt DESC, type);
```

## Benefits

1. **Spam Prevention**: Rate limiting prevents notification flooding
2. **Duplicate Prevention**: Deduplication ensures users don't receive the same notification multiple times
3. **Security Enhancement**: Input sanitization prevents XSS and injection attacks
4. **Performance Improvement**: Database indexes speed up queries significantly
5. **User Experience**: Users receive relevant notifications without spam

## Configuration

### Environment Variables:
```env
# Redis Configuration (for rate limiting & deduplication)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=300  # 5 minutes default
```

### Customization:
- Rate limits can be adjusted per notification type
- Deduplication window can be modified (default 5 minutes)
- Sanitization rules can be extended for specific use cases

## Monitoring

The system provides metrics for:
- Rate limit hits per user
- Duplicates blocked
- Notification delivery success rates
- Queue processing statistics

## Future Enhancements

1. **Admin Dashboard**: UI for managing rate limits and viewing metrics
2. **User Preferences**: Allow users to set their own notification preferences
3. **Advanced Deduplication**: Content similarity detection using fuzzy matching
4. **Dynamic Rate Limiting**: Adjust limits based on user behavior and system load
5. **Webhook Support**: Send notifications to external systems

## Testing

### Manual Testing:
1. Send multiple notifications rapidly to trigger rate limiting
2. Send identical notifications to test deduplication
3. Send notifications with HTML/script tags to test sanitization
4. Check rate limit status endpoint
5. Reset rate limits and verify they're cleared

### Integration Testing:
- Test rate limiting across different notification types
- Verify bulk notifications respect rate limits
- Ensure sanitization doesn't break legitimate content
- Confirm indexes improve query performance

## Troubleshooting

### Common Issues:

1. **Rate Limit Not Working**: 
   - Check Redis connection
   - Verify cache service is initialized
   - Check rate limit configuration

2. **Duplicates Still Appearing**:
   - Verify Redis is storing deduplication hashes
   - Check TTL settings
   - Ensure content hashing is consistent

3. **Sanitization Too Aggressive**:
   - Review allowed tags and attributes
   - Adjust sanitization rules for specific content types
   - Test with various content formats

## Conclusion

The implementation successfully addresses the critical security and reliability concerns identified in the notification module analysis. The system now has robust protection against spam, duplicates, and injection attacks while maintaining good performance through optimized database queries.