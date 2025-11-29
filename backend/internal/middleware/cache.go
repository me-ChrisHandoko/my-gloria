package middleware

import (
	"sync"
	"time"
)

// Cache provides a simple in-memory cache with TTL support
type Cache struct {
	items   sync.Map
	ttl     time.Duration
	cleanup time.Duration
}

type cacheItem struct {
	value      interface{}
	expiration time.Time
}

// NewCache creates a new cache with the specified TTL and cleanup interval
func NewCache(ttl, cleanup time.Duration) *Cache {
	c := &Cache{
		ttl:     ttl,
		cleanup: cleanup,
	}

	// Start cleanup goroutine
	go c.startCleanup()

	return c
}

// Get retrieves a value from cache
func (c *Cache) Get(key string) (interface{}, bool) {
	value, exists := c.items.Load(key)
	if !exists {
		return nil, false
	}

	item := value.(*cacheItem)
	if time.Now().After(item.expiration) {
		c.items.Delete(key)
		return nil, false
	}

	return item.value, true
}

// Set stores a value in cache with the default TTL
func (c *Cache) Set(key string, value interface{}) {
	c.items.Store(key, &cacheItem{
		value:      value,
		expiration: time.Now().Add(c.ttl),
	})
}

// SetWithTTL stores a value in cache with a custom TTL
func (c *Cache) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	c.items.Store(key, &cacheItem{
		value:      value,
		expiration: time.Now().Add(ttl),
	})
}

// Delete removes a value from cache
func (c *Cache) Delete(key string) {
	c.items.Delete(key)
}

// Clear removes all items from cache
func (c *Cache) Clear() {
	c.items.Range(func(key, value interface{}) bool {
		c.items.Delete(key)
		return true
	})
}

// startCleanup removes expired items periodically
func (c *Cache) startCleanup() {
	ticker := time.NewTicker(c.cleanup)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		c.items.Range(func(key, value interface{}) bool {
			item := value.(*cacheItem)
			if now.After(item.expiration) {
				c.items.Delete(key)
			}
			return true
		})
	}
}

// GetStats returns cache statistics
func (c *Cache) GetStats() map[string]int {
	stats := map[string]int{
		"total_items": 0,
		"expired":     0,
	}

	now := time.Now()
	c.items.Range(func(key, value interface{}) bool {
		stats["total_items"]++
		item := value.(*cacheItem)
		if now.After(item.expiration) {
			stats["expired"]++
		}
		return true
	})

	return stats
}
