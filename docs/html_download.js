(() => {
  const current = document.currentScript;
  if (current && current.parentNode) {
    current.parentNode.removeChild(current);
  }
  document
    .querySelectorAll("script[src*='html_download.js']")
    .forEach((node) => node.remove());

  const html = (() => {
    const doctype = document.doctype
      ? `<!DOCTYPE ${document.doctype.name}>`
      : "<!DOCTYPE html>";
    const body = document.documentElement.outerHTML;
    return `${doctype}\n${body}`;
  })();

  const title = (document.title || "page")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const filename = `${title}_${stamp}.html`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
})();
