package server

import (
	"fmt"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/configs"
	loggerPkg "github.com/nerdneilsfield/shlogin/pkg/logger"
	"go.uber.org/zap"
)

var logger_ = loggerPkg.GetLogger()

type TranslationRequest struct {
	Text string `json:"text"`
	From string `json:"from"`
	To   string `json:"to"`
}

type TranslationRequestWithModelName struct {
	TranslationRequest
	ModelName string `json:"model_name"`
}

type TranslationResponse struct {
	TranslatedText string `json:"translated_text"`
}

type HcfyRequest struct {
	Name        string   `json:"name"`
	Text        string   `json:"text"`
	Destination []string `json:"destination"` //["中文(简体)", "英语"]
	Source      string   `json:"source"`      // undefined -> auto
}

type HcfyResponse struct {
	Text   string   `json:"text"`
	From   string   `json:"from"`
	To     string   `json:"to"`
	Result []string `json:"result"`
}

func NewAuthMiddleware(authTokens []string) func() fiber.Handler {
	return func() fiber.Handler {
		return func(ctx *fiber.Ctx) error {
			authHeader := ctx.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if !slices.Contains(authTokens, token) {
				return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
			}
			return ctx.Next()
		}
	}
}

func CreateServer(config *configs.Config) *fiber.App {
	logger_.Debug("Creating server", zap.Any("config", config))
	app := fiber.New(fiber.Config{
		ErrorHandler: func(ctx *fiber.Ctx, err error) error {
			logger_.Error("Error in Fiber", zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
		},
	})

	app.Use(logger.New())
	app.Use(cors.New())

	authMiddleware := NewAuthMiddleware(config.AuthToken)

	api := app.Group("/api/v1", authMiddleware())

	clientManager := configs.CreateClientManager(config.Models)

	api.Post("/translate", func(ctx *fiber.Ctx) error {
		var request TranslationRequestWithModelName
		if err := ctx.BodyParser(&request); err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.ModelName == "" || request.From == "" || request.To == "" || request.Text == "" {
			logger_.Error("Invalid request", zap.Any("request", request))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		client, err := clientManager.GetClientByName(request.ModelName)
		if err != nil {
			logger_.Error("Client not found", zap.String("ModelName", request.ModelName), zap.Error(err), zap.Any("clients", clientManager.GetAllNames()))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
		}

		translatedText, err := client.Complete(ctx.Context(), request.Text, request.From, request.To)
		if err != nil {
			logger_.Error("Error translating text", zap.String("ModelName", request.ModelName), zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
		}

		return ctx.Status(fiber.StatusOK).JSON(TranslationResponse{TranslatedText: translatedText})
	})

	modelGroup := api.Group("/models")

	modelGroup.Get("/", func(ctx *fiber.Ctx) error {
		return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
			"models_by_name":     clientManager.GetAllNames(),
			"models_by_endpoint": clientManager.GetAllEndpoints(),
		})
	})

	for _, endpoint := range clientManager.GetAllEndpoints() {
		logger_.Info("Adding endpoint", zap.String("endpoint", endpoint))
		modelGroup.Post(endpoint, func(ctx *fiber.Ctx) error {
			var request TranslationRequest
			if err := ctx.BodyParser(&request); err != nil {
				logger_.Error("Invalid request", zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			if request.From == "" || request.To == "" || request.Text == "" {
				logger_.Error("Invalid request", zap.Any("request", request))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			client, err := clientManager.GetClientByEndpoint(endpoint)
			if err != nil {
				logger_.Error("Client not found", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
			}

			translatedText, err := client.Complete(ctx.Context(), request.Text, request.From, request.To)
			if err != nil {
				logger_.Error("Error translating text", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
			}
			return ctx.Status(fiber.StatusOK).JSON(TranslationResponse{TranslatedText: translatedText})
		})
	}

	app.Post("/api/hcfy", func(ctx *fiber.Ctx) error {
		var request HcfyRequest
		if err := ctx.BodyParser(&request); err != nil {
			logger_.Error("Invalid request", zap.Error(err))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.Name == "" || request.Text == "" || len(request.Destination) == 0 {
			logger_.Error("Invalid request", zap.Any("request", request))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.Source == "" {
			request.Source = "auto"
		}

		client, err := clientManager.GetClientByName(request.Name)
		if err != nil {
			logger_.Error("Client not found", zap.String("name", request.Name), zap.Error(err))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
		}

		translatedText, err := client.Complete(ctx.Context(), request.Text, request.Source, request.Destination[0])
		if err != nil {
			logger_.Error("Error translating text", zap.String("name", request.Name), zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
		}
		splitText := strings.Split(translatedText, "\n")
		return ctx.Status(fiber.StatusOK).JSON(HcfyResponse{Text: translatedText, From: request.Source, To: request.Destination[0], Result: splitText})
	})

	return app
}

func RunServer(config *configs.Config) error {
	app := CreateServer(config)
	logger_.Info("Starting server", zap.String("host", config.Host), zap.Int("port", config.Port))
	return app.Listen(fmt.Sprintf("%s:%d", config.Host, config.Port))
}
