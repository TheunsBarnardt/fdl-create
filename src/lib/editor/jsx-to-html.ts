export function jsxToHtml(src: string): string {
  return src
    .replace(/className=/g, 'class=')
    .replace(
      /<(div|section|article|span|p|ul|li|ol|form|footer|nav|header|main|blockquote)(\s[^>]*)?\s*\/>/g,
      (_, tag, attrs) => `<${tag}${attrs ?? ''}></${tag}>`
    );
}
