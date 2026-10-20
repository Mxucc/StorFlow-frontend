import { Marked } from "marked";

/**
 * 商品介绍的 Markdown → HTML。
 *
 * 商品页是公开页面、内容由卖家填写，所以这里不假设「作者可信」：
 *
 *   - 原始 HTML 一律丢弃，只渲染 Markdown 语法本身；
 *   - 链接与图片地址只允许 http/https、站内相对路径、锚点与 mailto，
 *     挡掉 `javascript:` 这类伪协议；
 *   - `![名称](地址?k=video)` 渲染成 `<video>`、`?k=audio` 渲染成 `<audio>`：
 *     卖家从网盘插入一个素材，页面上就得到对应的播放器。
 */

const SAFE_URL = /^(https?:|\/|#|mailto:)/i;

const escapeHTML = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

const safeURL = (url?: string | null): string => {
  const value = (url ?? "").trim();
  return SAFE_URL.test(value) ? value : "";
};

/** 素材 URL 上的 kind 提示，由「插入网盘素材」写入。 */
const embedKind = (url: string): string | undefined => /[?&]k=(video|audio)\b/.exec(url)?.[1];

const markdown = new Marked({ gfm: true, breaks: true });

markdown.use({
  renderer: {
    // 丢弃原始 HTML：Markdown 里写 <script> 不会被执行，也不会进 DOM。
    html: () => "",
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const url = safeURL(href);
      if (!url) {
        return text;
      }
      const titleAttr = title ? ` title="${escapeHTML(title)}"` : "";
      return `<a href="${escapeHTML(url)}"${titleAttr} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
    },
    image({ href, title, text }) {
      const url = safeURL(href);
      const alt = escapeHTML(text ?? "");
      if (!url) {
        return alt;
      }
      const titleAttr = title ? ` title="${escapeHTML(title)}"` : "";
      const kind = embedKind(url);
      if (kind === "video") {
        return `<video class="cr-embed" src="${escapeHTML(
          url,
        )}"${titleAttr} controls preload="metadata" playsinline></video>`;
      }
      if (kind === "audio") {
        return `<audio class="cr-embed" src="${escapeHTML(url)}"${titleAttr} controls preload="metadata"></audio>`;
      }
      return `<img src="${escapeHTML(url)}" alt="${alt}"${titleAttr} loading="lazy" />`;
    },
  },
});

/** 把商品介绍的 Markdown 渲染成可安全插入的 HTML。 */
export const renderMarkdown = (source?: string | null): string => {
  if (!source) {
    return "";
  }
  return markdown.parse(source, { async: false });
};
