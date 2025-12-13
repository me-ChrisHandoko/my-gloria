package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// HRStatusChangeNotification represents the notification payload from database trigger
type HRStatusChangeNotification struct {
	ClerkUserID string    `json:"clerk_user_id"`
	NIP         string    `json:"nip"`
	Nama        string    `json:"nama"`
	Email       string    `json:"email"`
	OldStatus   string    `json:"old_status"`
	NewStatus   string    `json:"new_status"`
	IsActive    bool      `json:"is_active"`
	ChangedAt   time.Time `json:"changed_at"`
	ChangedBy   string    `json:"changed_by"`
}

// HRStatusListener listens for employee status changes from HR database
// and invalidates auth cache in real-time for instant logout/access denial
type HRStatusListener struct {
	db            *gorm.DB
	listener      *pq.Listener
	stopCh        chan struct{}
	isRunning     bool
	statsEnabled  bool
	totalReceived int64
	totalInvalidated int64
}

// NewHRStatusListener creates a new HR status change listener
func NewHRStatusListener(db *gorm.DB, connectionString string) *HRStatusListener {
	listener := pq.NewListener(
		connectionString,
		10*time.Second,  // minReconnectInterval
		time.Minute,     // maxReconnectInterval
		func(ev pq.ListenerEventType, err error) {
			if err != nil {
				log.Printf("❌ [HR Listener] Connection error: %v", err)
			}
			switch ev {
			case pq.ListenerEventConnected:
				log.Println("✅ [HR Listener] Connected to database")
			case pq.ListenerEventDisconnected:
				log.Println("⚠️  [HR Listener] Disconnected from database")
			case pq.ListenerEventReconnected:
				log.Println("🔄 [HR Listener] Reconnected to database")
			case pq.ListenerEventConnectionAttemptFailed:
				log.Println("❌ [HR Listener] Connection attempt failed")
			}
		},
	)

	return &HRStatusListener{
		db:           db,
		listener:     listener,
		stopCh:       make(chan struct{}),
		isRunning:    false,
		statsEnabled: true,
	}
}

// Start begins listening for HR status changes
func (l *HRStatusListener) Start(ctx context.Context) error {
	if l.isRunning {
		return fmt.Errorf("listener already running")
	}

	err := l.listener.Listen("hr_status_changed")
	if err != nil {
		return fmt.Errorf("failed to listen on channel 'hr_status_changed': %w", err)
	}

	l.isRunning = true
	log.Println("✅ [HR Listener] Started - listening for employee status changes from HR")
	log.Println("   └─ Channel: hr_status_changed")
	log.Println("   └─ Purpose: Real-time cache invalidation for instant user logout")

	go l.listen(ctx)

	return nil
}

// listen is the main event loop that processes notifications
func (l *HRStatusListener) listen(ctx context.Context) {
	defer func() {
		l.isRunning = false
		log.Println("🛑 [HR Listener] Event loop stopped")
	}()

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 [HR Listener] Context cancelled - stopping...")
			l.Stop()
			return

		case <-l.stopCh:
			log.Println("🛑 [HR Listener] Stop signal received")
			return

		case notification := <-l.listener.Notify:
			if notification != nil {
				l.handleNotification(notification)
			}

		case <-time.After(90 * time.Second):
			// Periodic ping to keep connection alive
			go func() {
				err := l.listener.Ping()
				if err != nil {
					log.Printf("⚠️  [HR Listener] Ping failed: %v - will reconnect automatically", err)
				}
			}()
		}
	}
}

// handleNotification processes a status change notification
func (l *HRStatusListener) handleNotification(notification *pq.Notification) {
	l.totalReceived++

	var data HRStatusChangeNotification
	if err := json.Unmarshal([]byte(notification.Extra), &data); err != nil {
		log.Printf("❌ [HR Listener] Failed to parse notification: %v", err)
		log.Printf("   └─ Raw payload: %s", notification.Extra)
		return
	}

	// Log the status change
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Printf("🔔 [HR Listener] Employee status changed")
	log.Printf("   ├─ NIP: %s", data.NIP)
	log.Printf("   ├─ Name: %s", data.Nama)
	log.Printf("   ├─ Email: %s", data.Email)
	log.Printf("   ├─ Status: %s → %s", data.OldStatus, data.NewStatus)
	log.Printf("   ├─ Active: %v", data.IsActive)
	log.Printf("   ├─ Changed By: %s", data.ChangedBy)
	log.Printf("   └─ Changed At: %s", data.ChangedAt.Format(time.RFC3339))

	// Invalidate auth cache immediately
	if data.ClerkUserID != "" {
		InvalidateAuthCache(data.ClerkUserID)
		l.totalInvalidated++

		log.Printf("✅ [HR Listener] Cache invalidated for clerk_user_id: %s", data.ClerkUserID)

		if !data.IsActive {
			log.Printf("🚫 [HR Listener] User %s (NIP: %s) will be DENIED access on next request",
				data.ClerkUserID, data.NIP)
			log.Println("   └─ Effect: Immediate logout (within 1 second)")
		} else {
			log.Printf("✅ [HR Listener] User %s (NIP: %s) access RESTORED",
				data.ClerkUserID, data.NIP)
			log.Println("   └─ Effect: Can access system again")
		}
	} else {
		log.Printf("⚠️  [HR Listener] No clerk_user_id - user not yet registered in system")
		log.Println("   └─ No cache invalidation needed (user never logged in)")
	}
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Log statistics periodically
	if l.statsEnabled && l.totalReceived%10 == 0 {
		l.logStats()
	}
}

// Stop stops the listener gracefully
func (l *HRStatusListener) Stop() {
	if !l.isRunning {
		return
	}

	log.Println("🛑 [HR Listener] Stopping...")

	close(l.stopCh)
	l.isRunning = false

	if l.listener != nil {
		err := l.listener.Close()
		if err != nil {
			log.Printf("⚠️  [HR Listener] Error closing listener: %v", err)
		}
	}

	// Log final statistics
	if l.statsEnabled {
		l.logStats()
	}

	log.Println("✅ [HR Listener] Stopped successfully")
}

// IsRunning returns whether the listener is currently running
func (l *HRStatusListener) IsRunning() bool {
	return l.isRunning
}

// GetStats returns listener statistics
func (l *HRStatusListener) GetStats() map[string]int64 {
	return map[string]int64{
		"total_received":    l.totalReceived,
		"total_invalidated": l.totalInvalidated,
	}
}

// logStats logs current statistics
func (l *HRStatusListener) logStats() {
	log.Println("📊 [HR Listener] Statistics")
	log.Printf("   ├─ Total notifications received: %d", l.totalReceived)
	log.Printf("   ├─ Total cache invalidations: %d", l.totalInvalidated)
	log.Printf("   └─ Success rate: %.2f%%",
		float64(l.totalInvalidated)/float64(l.totalReceived)*100)
}
