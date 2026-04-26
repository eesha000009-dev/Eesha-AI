'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { X, Save, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    css: 'css', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    swift: 'swift', kt: 'kotlin', scala: 'scala', php: 'php',
  };
  return map[ext] || 'text';
}

export function CodeEditor() {
  const { openFiles, activeFilePath, updateFileContent, closeFile, markFileSaved, setActiveFile } = useWorkspaceStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    try {
      const res = await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile.path, content: activeFile.content }),
      });
      if (res.ok) {
        markFileSaved(activeFile.path);
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch { /* */ }
  }, [activeFile, markFileSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  if (openFiles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-card text-muted-foreground">
        <FileCode className="mb-3 size-12 opacity-30" />
        <p className="text-sm">No file open</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Click a file in the explorer or ask the AI to create one</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-muted/50">
        <div className="flex flex-1 overflow-x-auto">
          {openFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={`group flex items-center gap-1.5 border-r border-border px-3 py-2 text-xs transition-colors ${
                file.path === activeFilePath
                  ? 'bg-card text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {file.modified && <span className="size-1.5 rounded-full bg-amber-500" />}
              <span className="max-w-[120px] truncate">{file.path.split('/').pop()}</span>
              <span
                onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="size-3" />
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-2">
          {saveStatus && <span className="text-[11px] text-emerald-500">{saveStatus}</span>}
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={handleSave}
            disabled={!activeFile?.modified}
            title="Save (Ctrl+S)"
          >
            <Save className="size-3" />
          </Button>
        </div>
      </div>

      {/* Path bar */}
      {activeFile && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1">
          <span className="text-[10px] text-muted-foreground">{activeFile.path}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-primary">
            {getLanguageFromPath(activeFile.path)}
          </span>
          {activeFile.modified && (
            <span className="text-[10px] text-amber-500">Modified</span>
          )}
        </div>
      )}

      {/* Editor area */}
      {activeFile && (
        <div className="relative flex-1">
          <div className="absolute inset-0 flex">
            {/* Line numbers */}
            <div className="w-12 select-none overflow-hidden border-r border-border bg-muted/30 py-3 text-right font-mono text-[11px] leading-[1.6] text-muted-foreground/50">
              {activeFile.content.split('\n').map((_, i) => (
                <div key={i} className="pr-3">{i + 1}</div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={activeFile.content}
              onChange={(e) => updateFileContent(activeFile.path, e.target.value)}
              className="flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-[1.6] text-foreground outline-none"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
