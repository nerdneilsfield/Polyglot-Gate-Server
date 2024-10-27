package client

import (
	"fmt"
	"time"

	"github.com/patrickmn/go-cache"
	"go.uber.org/zap"
)

type Cache interface {
	Get(key string) (string, error)
	Set(key string, value string, expiration time.Duration) error
}

type MemoryCache struct {
	cache *cache.Cache
}

func NewMemoryCache(defaultExpiration, cleanupInterval time.Duration) *MemoryCache {
	return &MemoryCache{
		cache: cache.New(defaultExpiration, cleanupInterval),
	}
}

func (mc *MemoryCache) Get(key string) (string, error) {
	if value, found := mc.cache.Get(key); found {
		return value.(string), nil
	}
	logger.Warn("Cache miss", zap.String("key", key))
	return "", fmt.Errorf("cache miss")
}

func (mc *MemoryCache) Set(key string, value string, expiration time.Duration) error {
	logger.Debug("Setting cache", zap.String("key", key), zap.String("value", value), zap.Duration("expiration", expiration))
	mc.cache.Set(key, value, expiration)
	return nil
}
