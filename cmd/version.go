package cmd

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"
)

func newVersionCmd(version string, buildTime string, gitCommit string) *cobra.Command {
	return &cobra.Command{
		Use:          "version",
		Short:        "Polyglot-Gate-Server version",
		Args:         cobra.NoArgs,
		SilenceUsage: true,
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Polyglot-Gate-Server")
			fmt.Println("A fast and flexible translation gateway that routes requests to various LLM endpoints with configurable rate limiting and model-specific prompts.")
			fmt.Println("Author: dengqi935@gmail.com")
			fmt.Println("Github: https://github.com/nerdneilsfield/Polyglot-Gate-Server")
			fmt.Println("Wiki: https://nerdneilsfield.github.io/Polyglot-Gate-Server/")
			fmt.Fprintf(cmd.OutOrStdout(), "Polyglot-Gate-Server: %s\n", version)
			fmt.Fprintf(cmd.OutOrStdout(), "buildTime: %s\n", buildTime)
			fmt.Fprintf(cmd.OutOrStdout(), "gitCommit: %s\n", gitCommit)
			fmt.Fprintf(cmd.OutOrStdout(), "goVersion: %s\n", runtime.Version())
		},
	}
}
