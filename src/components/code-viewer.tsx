'use client';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type Props = {
  value: string;
  language: 'json' | 'shell' | 'typescript' | 'javascript';
  maxLines?: number;
  minLines?: number;
};

export function CodeViewer({ value, language, maxLines = 24, minLines = 3 }: Props) {
  const lineCount = Math.min(maxLines, Math.max(minLines, value.split('\n').length));
  const height = lineCount * 18 + 16;

  return (
    <div className="rounded-md overflow-hidden border border-ink-900 bg-ink-950">
      <MonacoEditor
        height={`${height}px`}
        language={language}
        theme="vs-dark"
        value={value}
        options={{
          readOnly: true,
          domReadOnly: true,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          lineHeight: 18,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          renderLineHighlight: 'none',
          padding: { top: 8, bottom: 8 },
          scrollbar: { vertical: 'auto', horizontal: 'auto', verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          renderWhitespace: 'none',
          contextmenu: false
        }}
      />
    </div>
  );
}
