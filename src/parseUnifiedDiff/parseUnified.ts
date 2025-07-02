interface DiffChunk {
  file: string;
  startLine: number;
  endLine: number;
  chunkContent: string;
}

export function parseUnifiedDiff(diffText: string): DiffChunk[] {
  const lines = diffText.split('\n');
  const chunks: DiffChunk[] = [];

  let currentFile = '';
  let currentChunk: string[] = [];
  let startLine = 0;
  let endLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Binary files')) continue;
    if (line.endsWith('.png') || line.endsWith('.webp')) continue;

    if (line.startsWith('diff --git')) {
      // flush previous
      if (currentChunk.length > 0 && currentFile) {
        chunks.push({
          file: currentFile,
          startLine,
          endLine,
          chunkContent: currentChunk.join('\n'),
        });
        currentChunk = [];
      }
      const filePathMatch = line.match(/b\/(.+)$/);
      currentFile = filePathMatch ? filePathMatch[1] : '';
    }

    if (line.startsWith('@@')) {
      const hunkMatch = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        startLine = parseInt(hunkMatch[1], 10);
        const lineCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
        endLine = startLine + lineCount - 1;
      }
    }

    if (
      currentFile &&
      (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))
    ) {
      currentChunk.push(line);
    }
  }

  // final flush
  if (currentChunk.length > 0 && currentFile) {
    chunks.push({
      file: currentFile,
      startLine,
      endLine,
      chunkContent: currentChunk.join('\n'),
    });
  }

  return chunks;
}
