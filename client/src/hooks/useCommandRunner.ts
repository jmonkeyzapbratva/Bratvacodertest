import { useState, useCallback, useRef } from "react";

export interface CommandOutput {
  type: "stdout" | "stderr" | "status" | "complete" | "error";
  data: string;
  timestamp: Date;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export function useCommandRunner(projectId: number | null) {
  const [isRunning, setIsRunning] = useState(false);
  const [outputs, setOutputs] = useState<CommandOutput[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runCommand = useCallback(
    async (
      command: string,
      onOutput?: (output: CommandOutput) => void
    ): Promise<CommandResult | null> => {
      if (!projectId) return null;

      setIsRunning(true);
      setOutputs([]);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/projects/${projectId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ command }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let result: CommandResult | null = null;
        const collectedStdout: string[] = [];
        const collectedStderr: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

            try {
              const event = JSON.parse(line.slice(6));
              let outputType: CommandOutput["type"] = "status";
              let outputData = "";

              if (event.type === "stdout") {
                outputType = "stdout";
                outputData = event.data || "";
                collectedStdout.push(outputData);
              } else if (event.type === "stderr") {
                outputType = "stderr";
                outputData = event.data || "";
                collectedStderr.push(outputData);
              } else if (event.type === "output") {
                outputType = "stdout";
                outputData = event.data || "";
                collectedStdout.push(outputData);
              } else if (event.type === "error") {
                outputType = "error";
                outputData = event.error || event.data || "";
                collectedStderr.push(outputData);
              } else if (event.type === "start") {
                outputType = "status";
                outputData = `$ ${event.command}`;
              } else if (event.type === "complete") {
                outputType = "complete";
                outputData = event.success ? "Command completed" : "Command failed";
                result = {
                  success: event.success ?? true,
                  output: event.output || collectedStdout.join(""),
                  error: event.error || (collectedStderr.length > 0 ? collectedStderr.join("") : undefined),
                  exitCode: event.exitCode ?? 0,
                };
              } else {
                outputType = "status";
                outputData = event.message || event.type || "";
              }

              if (outputData) {
                const output: CommandOutput = {
                  type: outputType,
                  data: outputData,
                  timestamp: new Date(),
                };
                setOutputs((prev) => [...prev, output]);
                onOutput?.(output);
              }
            } catch (e) {
              console.warn("Failed to parse SSE event:", line);
            }
          }
        }

        setIsRunning(false);
        
        if (!result) {
          result = {
            success: true,
            output: collectedStdout.join(""),
            error: collectedStderr.length > 0 ? collectedStderr.join("") : undefined,
            exitCode: 0,
          };
        }
        
        return result;
      } catch (error: any) {
        if (error.name === "AbortError") {
          setOutputs((prev) => [
            ...prev,
            { type: "status", data: "Command cancelled", timestamp: new Date() },
          ]);
        } else {
          setOutputs((prev) => [
            ...prev,
            { type: "error", data: error.message, timestamp: new Date() },
          ]);
        }
        setIsRunning(false);
        return null;
      }
    },
    [projectId]
  );

  const stopCommand = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const installDependencies = useCallback(
    async (packages?: string[]) => {
      if (!projectId) return null;

      const command = packages?.length
        ? `npm install ${packages.join(" ")}`
        : "npm install";

      return runCommand(command);
    },
    [projectId, runCommand]
  );

  const runDevServer = useCallback(async () => {
    if (!projectId) return null;
    return runCommand("npm run dev");
  }, [projectId, runCommand]);

  const runBuild = useCallback(async () => {
    if (!projectId) return null;
    return runCommand("npm run build");
  }, [projectId, runCommand]);

  const clearOutputs = useCallback(() => {
    setOutputs([]);
  }, []);

  return {
    isRunning,
    outputs,
    runCommand,
    stopCommand,
    installDependencies,
    runDevServer,
    runBuild,
    clearOutputs,
  };
}
