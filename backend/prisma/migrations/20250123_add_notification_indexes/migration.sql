-- CreateIndex for notification query optimization
-- Index for finding notifications by user and read status
CREATE INDEX IF NOT EXISTS "idx_notification_user_read" ON "gloria_ops"."notifications"("userProfileId", "isRead");

-- Index for finding notifications sorted by creation date and type
CREATE INDEX IF NOT EXISTS "idx_notification_created_type" ON "gloria_ops"."notifications"("createdAt" DESC, "type");

-- Partial index for unread notifications with priority
CREATE INDEX IF NOT EXISTS "idx_notification_priority_unread" ON "gloria_ops"."notifications"("priority") WHERE "isRead" = false;

-- Index for efficient counting of unread notifications per user
CREATE INDEX IF NOT EXISTS "idx_notification_user_unread_count" ON "gloria_ops"."notifications"("userProfileId") WHERE "isRead" = false;

-- Composite index for complex queries with date ranges
CREATE INDEX IF NOT EXISTS "idx_notification_user_date_type" ON "gloria_ops"."notifications"("userProfileId", "createdAt" DESC, "type");