// simple chunker: split diff into N-line pieces
export function chunkDiff(diff: string, maxLines = 500): string[] {
  const lines = diff.split('\n');
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return chunks;
}
