package client

import (
	"context"
	"fmt"
	"strings"
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
	)

	cacheKey := fmt.Sprintf("%s_%s_%s_%s_%s", c.info.Name, c.info.ModelName, fromLanguage, toLanguage, inputText)

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

	// 添加响应内容检查
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from model %s", c.info.ModelName)
	}

	content := resp.Choices[0].Message.Content
	// 检查内容是否为空或包含错误信息
	if strings.Contains(content, "内容由于不合规被停止生成") {
		logger.Error("Content blocked by model",
			zap.String("Content", content),
			zap.String("Name", c.info.Name),
			zap.String("Model", c.info.ModelName),
			zap.String("Endpoint", c.info.Endpoint),
		)
		return "", fmt.Errorf("content blocked by model %s", c.info.ModelName)
	}

	if err := c.cache.Set(cacheKey, content, time.Hour*time.Duration(c.info.CacheExpireHours)); err != nil {
		logger.Warn("Failed to set cache", zap.Error(err), zap.String("Key", cacheKey))
	}

	return content, nil
}

func (c *OpenAIClient) GetClientInfo() ClientInfo {
	return c.info
}
