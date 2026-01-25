(() => {
  const footerHtml = `
    各ツールは制作中です。順次修正・追加予定。
     <br>
    もしよければ
     <a href="https://www.amazon.jp/hz/wishlist/ls/193UZ703SCTQJ?ref_=wl_share" target="_blank" rel="noopener">欲しいものリスト</a> 
    から支援していただけると、アップデートのモチベーションになります。
  `.trim();

  const main = document.querySelector("main");
  if (!main) return;
  if (document.querySelector("footer[data-common-footer]")) return;

  const footer = document.createElement("footer");
  footer.setAttribute("data-common-footer", "true");
  footer.innerHTML = footerHtml;
  main.appendChild(footer);
})();

