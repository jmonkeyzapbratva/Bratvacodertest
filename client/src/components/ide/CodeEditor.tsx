import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "@/components/ThemeProvider";
import type { ProjectFile } from "./FileExplorer";
import { useCallback, useRef } from "react";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  file: ProjectFile | null;
  onChange: (content: string) => void;
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    py: "python",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    env: "plaintext",
    gitignore: "plaintext",
  };
  return languageMap[ext || ""] || "plaintext";
}

export function CodeEditor({ file, onChange }: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      strict: true,
    });
  }, []);
  
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Nenhum arquivo selecionado</p>
          <p className="text-sm mt-2">Selecione um arquivo na barra lateral para editar</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <span className="text-sm font-mono">{file.path}</span>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.path)}
          value={file.content}
          onChange={(value) => onChange(value || "")}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true, scale: 1 },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 16 },
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
            
            multiCursorModifier: "alt",
            multiCursorMergeOverlapping: true,
            columnSelection: true,
            
            matchBrackets: "always",
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
            autoSurround: "languageDefined",
            
            folding: true,
            foldingStrategy: "auto",
            foldingHighlight: true,
            showFoldingControls: "always",
            
            quickSuggestions: { other: true, comments: true, strings: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "currentDocument",
            snippetSuggestions: "inline",
            suggestSelection: "first",
            
            parameterHints: { enabled: true, cycle: true },
            inlayHints: { enabled: "on" },
            
            codeLens: true,
            
            guides: {
              bracketPairs: true,
              bracketPairsHorizontal: true,
              highlightActiveBracketPair: true,
              indentation: true,
              highlightActiveIndentation: true,
            },
            
            renderWhitespace: "selection",
            renderControlCharacters: true,
            
            formatOnPaste: true,
            formatOnType: true,
            
            hover: { enabled: true, delay: 300 },
            
            find: {
              addExtraSpaceOnTop: true,
              autoFindInSelection: "multiline",
              seedSearchStringFromSelection: "selection",
            },
            
            stickyScroll: { enabled: true },
            
            linkedEditing: true,
          }}
        />
      </div>
    </div>
  );
}
