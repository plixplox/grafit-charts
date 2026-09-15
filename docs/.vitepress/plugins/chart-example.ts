/**
 * Разворачивает однострочную директиву
 *   ::: chart-example <name>
 * в живую демку + code-group с исходниками примера:
 *   <ChartExample name="<name>" />
 *   ::: code-group
 *   <<< @/../examples/<name>/config.ts [config.ts]
 *   <<< @/../examples/<name>/data.ts [data.ts]
 *   :::
 * Файлы подключаются сниппетами VitePress — код демки и код на странице
 * один и тот же, без дублирования. data.ts всегда последняя вкладка.
 */
import type MarkdownIt from 'markdown-it';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXAMPLES_DIR = fileURLToPath(new URL('../../../examples', import.meta.url));
const DIRECTIVE = /^:::\s*chart-example\s+([\w-]+)(?:\s+(\d+))?\s*$/gm;

/** height — необязательная высота демки в px (`::: chart-example <name> 48`), по умолчанию её задаёт ChartExample. */
function expand(name: string, height?: string): string {
  const dir = path.join(EXAMPLES_DIR, name);
  if (!fs.existsSync(dir)) {
    throw new Error(`chart-example: директория examples/${name} не найдена`);
  }
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.ts'));
  const ordered = [
    ...files.filter((file) => file === 'config.ts'),
    ...files.filter((file) => file !== 'config.ts' && file !== 'data.ts').sort(),
    ...files.filter((file) => file === 'data.ts'),
  ];
  const snippets = ordered.map((file) => `<<< @/../examples/${name}/${file} [${file}]`).join('\n');
  const heightProp = height ? ` :height="${height}"` : '';
  return `<ChartExample name="${name}"${heightProp} />\n\n::: code-group\n${snippets}\n:::`;
}

export function chartExamplePlugin(md: MarkdownIt): void {
  md.core.ruler.before('normalize', 'chart-example', (state) => {
    state.src = state.src.replace(DIRECTIVE, (_match, name: string, height?: string) => expand(name, height));
  });
}
