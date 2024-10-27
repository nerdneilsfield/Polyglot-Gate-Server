package cmd

import (
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/configs"
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/server"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

func newRunCmd() *cobra.Command {
	return &cobra.Command{
		Use:          "run",
		Short:        "Run Polyglot-Gate-Server",
		Args:         cobra.ExactArgs(1),
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			configPath := args[0]
			config, err := configs.LoadConfig(configPath)
			if err != nil {
				logger.Error("Failed to load config", zap.Error(err))
				return err
			}
			return server.RunServer(config)
		},
	}
}
