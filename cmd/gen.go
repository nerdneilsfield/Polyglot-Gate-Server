package cmd

import (
	"github.com/nerdneilsfield/Polyglot-Gate-Server/internal/configs"
	"github.com/spf13/cobra"
)

func newGenCmd() *cobra.Command {
	return &cobra.Command{
		Use:          "gen",
		Short:        "Generate example config file",
		Args:         cobra.ExactArgs(1),
		SilenceUsage: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			return configs.GenerateExampleConfig(args[0])
		},
	}
}
