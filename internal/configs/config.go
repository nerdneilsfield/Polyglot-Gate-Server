package configs

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/nerdneilsfield/Polyglot-Gate-Server/pkg/client"
	loggerPkg "github.com/nerdneilsfield/shlogin/pkg/logger"
	"go.uber.org/zap"
)

var logger = loggerPkg.GetLogger()

var validModelTypes = []string{"openai"}

//go:embed config_example.toml
var exampleConfigFs embed.FS

type Config struct {
	Port      int      `toml:"port"`
	Host      string   `toml:"host"`
	LogFile   string   `toml:"log_file"`
	AuthToken []string `toml:"auth_token"`
	Models    []Model  `toml:"models"`
}

type Model struct {
	Name             string  `toml:"name"`
	BaseURL          string  `toml:"base_url"`
	Type             string  `toml:"type"`
	APIKey           string  `toml:"api_key"`
	ModelName        string  `toml:"model_name"`
	MaxTokens        int     `toml:"max_tokens"`
	Temperature      float32 `toml:"temperature"`
	Prompt           string  `toml:"prompt"`
	RateLimit        float64 `toml:"rate_limit"`
	Endpoint         string  `toml:"endpoint"`
	CacheExpireHours int     `toml:"cache_expire_hours"`
}

func LoadConfig(path string) (*Config, error) {
	// check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		logger.Error("Config file not found", zap.String("Path", path))
		return nil, fmt.Errorf("config file not found: %s", path)
	}

	// read file
	var config Config
	if _, err := toml.DecodeFile(path, &config); err != nil {
		logger.Error("Failed to decode config file", zap.String("Path", path), zap.Error(err))
		return nil, err
	}

	if err := config.Validate(); err != nil {
		logger.Error("Invalid config", zap.Error(err))
		return nil, err
	}

	if config.LogFile != "" {
		logger.Info("Log file set", zap.String("Path", config.LogFile))
		logger.SetLogFilePath(config.LogFile)
		logger.SetVerbose(logger.GetVerbose())
		logger.SetSaveToFile(true)
	}
	logger.Info("Config loaded", zap.Any("Config", config))
	return &config, nil
}

func (c *Config) Validate() error {
	if c.Port <= 0 || c.Port > 65535 {
		logger.Error("Invalid port", zap.Int("Port", c.Port))
		return fmt.Errorf("invalid port: %d", c.Port)
	}
	if c.Host == "" {
		logger.Error("Invalid host", zap.String("Host", c.Host))
		return fmt.Errorf("invalid host: %s", c.Host)
	}

	for _, model := range c.Models {
		if model.Name == "" {
			logger.Error("Invalid model name", zap.String("Name", model.Name))
			return fmt.Errorf("invalid model name: %s", model.Name)
		}
		if model.BaseURL == "" {
			logger.Error("Invalid base URL", zap.String("BaseURL", model.BaseURL))
			return fmt.Errorf("invalid base URL: %s", model.BaseURL)
		}
		if !slices.Contains(validModelTypes, model.Type) {
			logger.Error("Invalid model type", zap.String("Type", model.Type))
			return fmt.Errorf("invalid model type: %s", model.Type)
		}
		if model.APIKey == "" {
			logger.Error("Invalid API key", zap.String("APIKey", model.APIKey))
			return fmt.Errorf("invalid API key: %s", model.APIKey)
		}
		if model.ModelName == "" {
			logger.Error("Invalid model name", zap.String("ModelName", model.ModelName))
			return fmt.Errorf("invalid model name: %s", model.ModelName)
		}
		if model.RateLimit <= 0 {
			logger.Error("Invalid rate limit", zap.Float64("RateLimit", model.RateLimit))
			return fmt.Errorf("invalid rate limit: %f", model.RateLimit)
		}
		if model.Endpoint == "" {
			logger.Error("Invalid endpoint", zap.String("Endpoint", model.Endpoint))
			return fmt.Errorf("invalid endpoint: %s", model.Endpoint)
		}
		if model.MaxTokens <= 0 {
			logger.Error("Invalid max tokens", zap.Int("MaxTokens", model.MaxTokens))
			return fmt.Errorf("invalid max tokens: %d", model.MaxTokens)
		}
		if model.Temperature < 0 || model.Temperature > 1 {
			logger.Error("Invalid temperature", zap.Float32("Temperature", model.Temperature))
			return fmt.Errorf("invalid temperature: %f", model.Temperature)
		}
		if model.Prompt == "" {
			logger.Error("Invalid prompt", zap.String("Prompt", model.Prompt))
			return fmt.Errorf("invalid prompt: %s", model.Prompt)
		}
		// check if prompt can be formatted
		// 检查 Prompt 格式
		expectedArgs := 3 // 期望的参数数量
		if !isValidPromptFormat(model.Prompt, expectedArgs) {
			logger.Error("Invalid prompt format", zap.String("Prompt", model.Prompt))
			return fmt.Errorf("invalid prompt format: %s", model.Prompt)
		}

		if model.CacheExpireHours <= 0 {
			logger.Error("Invalid cache expire hours", zap.Int("CacheExpireHours", model.CacheExpireHours))
			return fmt.Errorf("invalid cache expire hours: %d", model.CacheExpireHours)
		}
	}
	return nil
}

func isValidPromptFormat(format string, expectedArgs int) bool {
	// 使用更灵活的方法来验证格式字符串
	placeholders := []string{"%s", "%d", "%f", "%v"}
	count := 0
	for _, ph := range placeholders {
		count += strings.Count(format, ph)
	}
	return count == expectedArgs
}

func GenerateExampleConfig(filePath string) error {
	// check if file path exists
	if _, err := os.Stat(filePath); !os.IsNotExist(err) {
		logger.Error("File already exists", zap.String("Path", filePath))
		return fmt.Errorf("file already exists: %s", filePath)
	}

	// check if file directory exists, if not create it
	dir := filepath.Dir(filePath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		logger.Info("Creating file directory", zap.String("Path", dir))
		if err := os.MkdirAll(dir, 0755); err != nil {
			logger.Error("Failed to create file directory", zap.String("Path", dir), zap.Error(err))
			return err
		}
	}
	exampleConfig, err := exampleConfigFs.ReadFile("config_example.toml")
	if err != nil {
		logger.Error("Failed to read example config file", zap.Error(err))
		return err
	}
	logger.Info("Writing example config file", zap.String("Path", filePath))
	return os.WriteFile(filePath, exampleConfig, 0644)
}

func CreateClientManager(models []Model) *client.ClientManager {
	clientManager := client.NewClientManager()
	for _, model := range models {
		if model.Type == "openai" {
			client := client.NewOpenAIClient(client.ClientInfo{
				Name:             model.Name,
				BaseURL:          model.BaseURL,
				Endpoint:         model.Endpoint,
				ModelName:        model.ModelName,
				MaxTokens:        model.MaxTokens,
				Temperature:      model.Temperature,
				Prompt:           model.Prompt,
				RateLimit:        model.RateLimit,
				CacheExpireHours: model.CacheExpireHours,
			}, model.APIKey)
			logger.Debug("Adding client", zap.String("ModelName", model.Name), zap.String("Endpoint", model.Endpoint))
			clientManager.AddClient(model.Endpoint, client)
		}
	}
	return clientManager
}
