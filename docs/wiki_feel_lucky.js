javascript:(() => {
  try {
    // --- 安全チェック：AtWikiの検索結果ページ以外なら即エラー ---
    const current = new URL(location.href);

    const isAtWiki = current.hostname === "w.atwiki.jp";
    const isSearchResult = current.searchParams.get("cmd") === "wikisearch";

    if (!isAtWiki || !isSearchResult) {
      throw new Error("NOT_ATWIKI_SEARCH_RESULT");
    }

    // --- 検索結果の「先頭っぽいリンク」を取得 ---
    // 添付例のように cmd=word&pageid=... を含むリンクを優先して拾う
    const firstLink =
      document.querySelector('a[href*="cmd=word"][href*="pageid="]') ||
      document.querySelector("div.wikisearch a");

    if (!firstLink) {
      alert("検索結果が見つかりませんでした（0件の可能性があります）");
      return;
    }

    const href = firstLink.getAttribute("href");
    if (!href) {
      alert("検索結果リンクの取得に失敗しました");
      return;
    }

    // --- 先頭結果へ遷移 ---
    // 相対パスでも絶対URLに解決して移動
    const dest = new URL(href, location.href).toString();
    location.href = dest;
  } catch (e) {
    alert(
      "このブックマークレットは AtWiki の検索結果ページ専用です。\n" +
      "（w.atwiki.jp かつ cmd=wikisearch のページで実行してください）"
    );
  }
})();
