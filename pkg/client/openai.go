package client

import (
	"context"
	"fmt"
	"time"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

type OpenAIClient struct {
	BaseClient
	client *openai.Client
	apiKey string
}

func NewOpenAIClient(info ClientInfo, apiKey string) *OpenAIClient {
	openaiConfig := openai.DefaultConfig(apiKey)
	openaiConfig.BaseURL = info.BaseURL

	return &OpenAIClient{
		BaseClient: BaseClient{
			info:    info,
			limiter: rate.NewLimiter(rate.Limit(info.RateLimit), 1),
			cache:   NewMemoryCache(time.Hour*time.Duration(info.CacheExpireHours), time.Minute*10),
		},
		apiKey: apiKey,
		client: openai.NewClientWithConfig(openaiConfig),
	}
}

func (c *OpenAIClient) Complete(ctx context.Context, inputText string, fromLanguage string, toLanguage string, forceRefresh bool) (string, error) {
	logger.Debug("Call OpenAI Complete",
		zap.String("Name", c.info.Name),
		zap.String("Model", c.info.ModelName),
		zap.String("Endpoint", c.info.Endpoint),
		zap.String("FromLanguage", fromLanguage),
		zap.String("ToLanguage", toLanguage),
		zap.String("InputText", inputText),
	)

	cacheKey := fmt.Sprintf("%s_%s_%s_%s", c.info.Name, c.info.ModelName, fromLanguage, toLanguage)

	if !forceRefresh {
		if cached, err := c.cache.Get(cacheKey); err == nil {
			logger.Debug("Cache hit", zap.String("Key", cacheKey))
			return cached, nil
		}
	}

	if err := c.limiter.Wait(ctx); err != nil {
		logger.Error("OpenAI rate limit exceeded",
			zap.Error(err),
			zap.String("Name", c.info.Name),
			zap.String("Model", c.info.ModelName),
			zap.String("Endpoint", c.info.Endpoint),
		)
		return "", err
	}

	resp, err := c.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: c.info.ModelName,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: fmt.Sprintf(c.info.Prompt, fromLanguage, toLanguage, inputText)},
		},
		Temperature: c.info.Temperature,
		MaxTokens:   c.info.MaxTokens,
	})
	if err != nil {
		logger.Error("OpenAI Complete failed",
			zap.Error(err),
			zap.String("Name", c.info.Name),
			zap.String("Model", c.info.ModelName),
			zap.String("Endpoint", c.info.Endpoint),
			zap.String("FromLanguage", fromLanguage),
			zap.String("ToLanguage", toLanguage),
		)
		return "", err
	}

	result := resp.Choices[0].Message.Content

	if err := c.cache.Set(cacheKey, result, time.Hour*time.Duration(c.info.CacheExpireHours)); err != nil {
		logger.Warn("Failed to set cache", zap.Error(err), zap.String("Key", cacheKey))
	}

	return result, nil
}

func (c *OpenAIClient) GetClientInfo() ClientInfo {
	return c.info
}
