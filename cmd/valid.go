package cmd

import (
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/configs"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

func newValidCmd() *cobra.Command {
	return &cobra.Command{
		Use:          "valid",
		Short:        "Validate config file",
		Args:         cobra.ExactArgs(1),
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			configPath := args[0]
			config, err := configs.LoadConfig(configPath)
			if err != nil {
				logger.Error("Failed to load config", zap.Error(err))
				return err
			}
			return config.Validate()
		},
	}
}
