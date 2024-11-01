package server

import (
	"bytes"
	"embed"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/configs"
	loggerPkg "github.com/nerdneilsfield/shlogin/pkg/logger"
	"go.uber.org/zap"
)

var logger = loggerPkg.GetLogger()

//go:embed frontend-dist/*
var frontend embed.FS

//go:embed favicon.ico
var favicon embed.FS

var deeplToLang = map[string]string{
	"ZH":   "Chinese(Simplified)",
	"DE":   "German",
	"EN":   "English",
	"ES":   "Spanish",
	"FR":   "French",
	"IT":   "Italian",
	"JA":   "Japanese",
	"NL":   "Dutch",
	"PL":   "Polish",
	"PT":   "Portuguese",
	"RU":   "Russian",
	"BG":   "Bulgarian",
	"CS":   "Czech",
	"DA":   "Danish",
	"EL":   "Greek",
	"ET":   "Estonian",
	"FI":   "Finnish",
	"HU":   "Hungarian",
	"LT":   "Lithuanian",
	"LV":   "Latvian",
	"RO":   "Romanian",
	"SK":   "Slovak",
	"SL":   "Slovenian",
	"SV":   "Swedish",
	"auto": "Auto Detect",
}

type TranslationRequest struct {
	Text         string `json:"text"`
	From         string `json:"from"` // default is auto
	To           string `json:"to"`
	ForceRefresh bool   `json:"force_refresh"` // default is false
}

type TranslationRequestWithModelName struct {
	TranslationRequest
	ModelName string `json:"model_name"`
}

type TranslationResponse struct {
	ModelName      string `json:"model_name"`
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

type DeepLXRequest struct {
	Text       string `json:"text"`
	SourceLang string `json:"source_lang"` // default is auto
	TragetLang string `json:"target_lang"` // ZH
}

type DeepLXResponse struct {
	Code         int32    `json:"code"`
	Msg          string   `json:"msg"`
	Data         string   `json:"data"`
	SourceLang   string   `json:"source_lang"` // default is auto
	TragetLang   string   `json:"target_lang"` // ZH
	Alternatives []string `json:"alternatives"`
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
	logger.Debug("Creating server", zap.Any("config", config))
	app := fiber.New(fiber.Config{
		ErrorHandler: func(ctx *fiber.Ctx, err error) error {
			logger.Error("Error in Fiber", zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Internal server error"})
		},
	})

	app.Use(fiberLogger.New())
	app.Use(cors.New())

	authMiddleware := NewAuthMiddleware(config.AuthToken)

	app.Use("/", filesystem.New(filesystem.Config{
		Root:       http.FS(frontend),
		PathPrefix: "/frontend-dist",
		Browse:     true,
	}))

	app.Get("/favicon.ico", func(ctx *fiber.Ctx) error {
		faviconFile, err := favicon.ReadFile("favicon.ico")
		if err != nil {
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read favicon"})
		}
		return ctx.Status(fiber.StatusOK).SendStream(bytes.NewReader(faviconFile))
	})

	api := app.Group("/api/v1", authMiddleware())

	clientManager := configs.CreateClientManager(config.Models)

	// translate api
	api.Post("/translate", func(ctx *fiber.Ctx) error {
		var request TranslationRequestWithModelName
		if err := ctx.BodyParser(&request); err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.ModelName == "" || request.From == "" || request.To == "" || request.Text == "" {
			logger.Error("Invalid request", zap.Any("request", request))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		client, err := clientManager.GetClientByName(request.ModelName)
		if err != nil {
			logger.Error("Client not found",
				zap.String("ModelName", request.ModelName),
				zap.Error(err),
				zap.Any("clients", clientManager.GetAllNames()),
			)
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
		}

		translatedText, err := client.Complete(ctx.Context(), request.Text, request.From, request.To, request.ForceRefresh)
		if err != nil {
			logger.Error("Error translating text", zap.String("ModelName", request.ModelName), zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
		}

		return ctx.Status(fiber.StatusOK).JSON(TranslationResponse{ModelName: request.ModelName, TranslatedText: translatedText})
	})

	modelGroup := api.Group("/models")

	modelGroup.Get("/", func(ctx *fiber.Ctx) error {
		return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
			"models_by_name":     clientManager.GetAllNames(),
			"models_by_endpoint": clientManager.GetAllEndpoints(),
		})
	})

	// translate api by endpoint
	for _, endpoint := range clientManager.GetAllEndpoints() {
		logger.Info("Adding endpoint", zap.String("endpoint", endpoint))
		modelGroup.Post(endpoint, func(ctx *fiber.Ctx) error {
			var request TranslationRequest
			if err := ctx.BodyParser(&request); err != nil {
				logger.Error("Invalid request", zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			if request.From == "" || request.To == "" || request.Text == "" {
				logger.Error("Invalid request", zap.Any("request", request))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			client, err := clientManager.GetClientByEndpoint(endpoint)
			if err != nil {
				logger.Error("Client not found", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
			}

			translatedText, err := client.Complete(ctx.Context(), request.Text, request.From, request.To, request.ForceRefresh)
			if err != nil {
				logger.Error("Error translating text", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
			}
			return ctx.Status(fiber.StatusOK).JSON(
				TranslationResponse{ModelName: client.GetClientInfo().ModelName, TranslatedText: translatedText},
			)
		})
	}

	// hcfy api
	app.Post("/api/hcfy", func(ctx *fiber.Ctx) error {
		var request HcfyRequest
		if err := ctx.BodyParser(&request); err != nil {
			logger.Error("Invalid request", zap.Error(err))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.Name == "" || request.Text == "" || len(request.Destination) == 0 {
			logger.Error("Invalid request", zap.Any("request", request))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if request.Source == "" {
			request.Source = "auto"
		}

		client, err := clientManager.GetClientByName(request.Name)
		if err != nil {
			logger.Error("Client not found", zap.String("name", request.Name), zap.Error(err))
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
		}

		translatedText, err := client.Complete(ctx.Context(), request.Text, request.Source, request.Destination[0], false)
		if err != nil {
			logger.Error("Error translating text", zap.String("name", request.Name), zap.Error(err))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
		}
		splitText := strings.Split(translatedText, "\n")
		return ctx.Status(fiber.StatusOK).JSON(
			HcfyResponse{Text: translatedText, From: request.Source, To: request.Destination[0], Result: splitText},
		)
	})

	// deeplx api
	deeplxGroup := app.Group("/api/deeplx")

	for _, endpoint := range clientManager.GetAllEndpoints() {
		logger.Info("Adding endpoint to /api/deeplx", zap.String("endpoint", endpoint))
		deeplxGroup.Post(endpoint, func(ctx *fiber.Ctx) error {
			var request DeepLXRequest
			if err := ctx.BodyParser(&request); err != nil {
				logger.Error("Invalid request", zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			if request.SourceLang == "" {
				request.SourceLang = "auto"
			}

			if request.TragetLang == "" || request.Text == "" {
				logger.Error("Invalid request", zap.Any("request", request))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
			}

			client, err := clientManager.GetClientByEndpoint(endpoint)
			if err != nil {
				logger.Error("Client not found", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Client not found"})
			}

			sourceLang := deeplToLang[request.SourceLang]
			targetLang := deeplToLang[request.TragetLang]

			translatedText, err := client.Complete(ctx.Context(), request.Text, sourceLang, targetLang, false)
			if err != nil {
				logger.Error("Error translating text", zap.String("endpoint", endpoint), zap.Error(err))
				return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error translating text"})
			}

			return ctx.Status(fiber.StatusOK).JSON(DeepLXResponse{
				Code:         200,
				Msg:          "success",
				Data:         translatedText,
				SourceLang:   request.SourceLang,
				TragetLang:   request.TragetLang,
				Alternatives: []string{},
			})
		})
	}

	return app
}

func RunServer(config *configs.Config) error {
	app := CreateServer(config)
	logger.Info("Starting server", zap.String("host", config.Host), zap.Int("port", config.Port))
	return app.Listen(fmt.Sprintf("%s:%d", config.Host, config.Port))
}
