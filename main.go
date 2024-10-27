package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/nerdneilsfield/Polyglot-Gate-Server/cmd"
	loggerPkg "github.com/nerdneilsfield/shlogin/pkg/logger"
	"go.uber.org/zap"
)

var (
	version   = "dev"
	buildTime = "unknown"
	gitCommit = "unknown"
)

var logger *loggerPkg.Logger

func init() {
	logger = loggerPkg.GetLogger()
	defer logger.SyncLogs()
	defer logger.Close()
}

// graceful shutdown
func gracefulShutdown() {
	logger.Info("Shutting down...")
	logger.SyncLogs()
	logger.Close()
}

func main() {
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-signalChan
		gracefulShutdown()
		os.Exit(0)
	}()

	if err := cmd.Execute(version, buildTime, gitCommit); err != nil {
		logger.Error("Failed to execute root command", zap.Error(err))
		os.Exit(1)
	}
}
