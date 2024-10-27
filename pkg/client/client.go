package client

import (
	"context"
	"fmt"
	"sync"
	"time"

	loggerPkg "github.com/nerdneilsfield/shlogin/pkg/logger"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

var logger = loggerPkg.GetLogger()

type Client interface {
	Complete(ctx context.Context, inputText string, fromLanguage string, toLanguage string, forceRefresh bool) (string, error)
	GetClientInfo() ClientInfo
}

type ClientInfo struct {
	Name             string
	MaxTokens        int
	Temperature      float32
	RateLimit        float64
	Prompt           string
	ModelName        string
	BaseURL          string
	Endpoint         string
	CacheExpireHours int
}

type BaseClient struct {
	info    ClientInfo
	limiter *rate.Limiter
	cache   Cache
}

func (c *BaseClient) GetClientInfo() ClientInfo {
	return c.info
}

func (c *BaseClient) Complete(ctx context.Context, inputText string, fromLanguage string, toLanguage string) (string, error) {
	return "", nil
}

func NewBaseClient(info ClientInfo) *BaseClient {
	cache := NewMemoryCache(time.Hour*time.Duration(info.CacheExpireHours), time.Minute*10)
	return &BaseClient{info: info, limiter: rate.NewLimiter(rate.Limit(info.RateLimit), 1), cache: cache}
}

type ClientManager struct {
	clientsWithEndpoint map[string]Client
	clientsWithName     map[string]Client
	mu                  sync.RWMutex
}

func NewClientManager() *ClientManager {
	return &ClientManager{clientsWithEndpoint: make(map[string]Client), clientsWithName: make(map[string]Client)}
}

func (m *ClientManager) AddClient(endpoint string, client Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	// check if client already exists
	if _, ok := m.clientsWithEndpoint[endpoint]; ok {
		logger.Error("Client already exists", zap.String("Endpoint", endpoint))
		return
	}
	m.clientsWithEndpoint[endpoint] = client
	m.clientsWithName[client.GetClientInfo().Name] = client
}

func (m *ClientManager) GetClientByEndpoint(endpoint string) (Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if client, ok := m.clientsWithEndpoint[endpoint]; ok {
		return client, nil
	}
	logger.Error("Client not found", zap.String("Endpoint", endpoint))
	return nil, fmt.Errorf("client not found")
}

func (m *ClientManager) GetClientByName(name string) (Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if client, ok := m.clientsWithName[name]; ok {
		return client, nil
	}
	logger.Error("Client not found", zap.String("Name", name))
	return nil, fmt.Errorf("client not found")
}

func (m *ClientManager) GetAllEndpoints() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	endpoints := make([]string, 0, len(m.clientsWithEndpoint))
	for endpoint := range m.clientsWithEndpoint {
		endpoints = append(endpoints, endpoint)
	}
	return endpoints
}

func (m *ClientManager) GetAllNames() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	names := make([]string, 0, len(m.clientsWithName))
	for name := range m.clientsWithName {
		names = append(names, name)
	}
	return names
}
