import { useState, useCallback } from "react";

export type ActionType = 
  | "file_edit" 
  | "file_create" 
  | "command_run" 
  | "build" 
  | "deploy" 
  | "git_commit"
  | "install_deps"
  | "status";

export type ActionStatus = "pending" | "running" | "success" | "error";

export interface SystemAction {
  id: string;
  type: ActionType;
  title: string;
  details?: string;
  status: ActionStatus;
  timestamp: Date;
  files?: string[];
  output?: string;
  duration?: number;
}

export function useSystemActions() {
  const [actions, setActions] = useState<SystemAction[]>([]);

  const addAction = useCallback((action: Omit<SystemAction, "id" | "timestamp">) => {
    const newAction: SystemAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setActions((prev) => [...prev, newAction]);
    return newAction.id;
  }, []);

  const updateAction = useCallback(
    (id: string, updates: Partial<Omit<SystemAction, "id" | "timestamp">>) => {
      setActions((prev) =>
        prev.map((action) =>
          action.id === id ? { ...action, ...updates } : action
        )
      );
    },
    []
  );

  const removeAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((action) => action.id !== id));
  }, []);

  const clearActions = useCallback(() => {
    setActions([]);
  }, []);

  const getRecentActions = useCallback(
    (count: number = 10) => {
      return [...actions].reverse().slice(0, count);
    },
    [actions]
  );

  const getPendingActions = useCallback(() => {
    return actions.filter((a) => a.status === "pending" || a.status === "running");
  }, [actions]);

  return {
    actions,
    addAction,
    updateAction,
    removeAction,
    clearActions,
    getRecentActions,
    getPendingActions,
  };
}
