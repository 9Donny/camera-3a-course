import { marked } from "../vendor/marked.esm.js";

marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });

export function renderMarkdown(md) {
  return marked.parse(md ?? "");
}
