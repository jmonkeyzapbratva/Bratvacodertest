import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modifiedAt?: string;
}

export interface FileContent {
  path: string;
  content: string;
}

export function useWorkspaceFiles(projectId: number | null, subPath: string = "") {
  const queryClient = useQueryClient();

  const filesQuery = useQuery<WorkspaceFile[]>({
    queryKey: ["/api/projects", projectId, "files", subPath],
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/api/projects/${projectId}/files${subPath ? `?path=${encodeURIComponent(subPath)}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error("Failed to fetch files");
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 5000,
  });

  const readFileMutation = useMutation({
    mutationFn: async (filePath: string): Promise<FileContent> => {
      const response = await fetch(
        `/api/projects/${projectId}/files/read?path=${encodeURIComponent(filePath)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to read file");
      return response.json();
    },
  });

  const createFileMutation = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/files`, { path, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      return apiRequest("PUT", `/api/projects/${projectId}/files`, { path, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/files`, { path });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    },
  });

  const initWorkspaceMutation = useMutation({
    mutationFn: async (template?: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/workspace/init`, { template });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
    },
  });

  return {
    files: filesQuery.data || [],
    isLoading: filesQuery.isLoading,
    isError: filesQuery.isError,
    error: filesQuery.error,
    refetch: filesQuery.refetch,
    readFile: readFileMutation.mutateAsync,
    createFile: createFileMutation.mutateAsync,
    updateFile: updateFileMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    initWorkspace: initWorkspaceMutation.mutateAsync,
    isCreating: createFileMutation.isPending,
    isUpdating: updateFileMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
  };
}
