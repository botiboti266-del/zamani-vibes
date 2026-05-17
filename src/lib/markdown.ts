import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(src: string | null | undefined): string {
  if (!src) return "";
  return marked.parse(src, { async: false }) as string;
}
