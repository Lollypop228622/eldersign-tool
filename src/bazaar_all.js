(async () => {
  /* ========= 設定 ========= */

  // 最大ページ数（安全装置）
  const MAX_PAGES = 15;

  // ウェイト設定（ms）
  const WAIT_MIN = 150;
  const WAIT_MAX = 350;

  /* ========= ユーティリティ ========= */

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const randomWait = () =>
    sleep(Math.floor(Math.random() * (WAIT_MAX - WAIT_MIN + 1)) + WAIT_MIN);

  /* ========= UI ========= */

  const root = document.createElement("div");
  root.style.cssText = `
    position:fixed;
    inset:8px;
    z-index:2147483647;
    background:#111c;
    color:#fff;
    border:1px solid #fff3;
    border-radius:12px;
    backdrop-filter:blur(6px);
    display:flex;
    flex-direction:column;
    font:14px/1.4 system-ui;
  `;

  root.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #fff2">
      <b>バザー横断</b>
      <span id="status" style="opacity:.8">準備中…</span>
      <div style="flex:1"></div>
      <button id="close" style="border:1px solid #fff3;background:#0006;color:#fff;border-radius:10px;padding:6px 10px">
        閉じる
      </button>
    </div>
    <div id="body" style="padding:10px 12px;overflow:auto"></div>
  `;

  document.body.appendChild(root);

  const statusEl = root.querySelector("#status");
  const bodyEl   = root.querySelector("#body");

  root.querySelector("#close").onclick = () => root.remove();

  const setStatus = (text) => statusEl.textContent = text;

  /* ========= 通信 ========= */

  const postSearch = async (fm, rr, pg) => {
    const res = await fetch(location.pathname, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        cmd: "f",
        fm,
        rr,
        st: 32,   // 出品順
        ad: 0,    // -
        ds: -1,
        pg
      }).toString()
    });

    return await res.text();
  };

  /* ========= HTML解析 ========= */

  const parser = new DOMParser();

  const parsePage = (html) => {
    const doc = parser.parseFromString(html, "text/html");

    // 出品リンク
    const items = [...doc.querySelectorAll(
      'nav.block ul > li > a[href*="tm="]'
    )].map(a => ({
      href: a.href,
      tm: Number(new URL(a.href).searchParams.get("tm")) || 0,
      html: a.outerHTML
    }));

    // 次ページ
    const nextLink = doc.querySelector(
      'nav.pager li.next a[href]:not(.disable)'
    );

    return {
      items,
      hasNext: !!nextLink
    };
  };

  /* ========= メイン処理 ========= */

  const allItems = [];
  const seen = new Set();
  let progress = 0;

  for (let fm = 1; fm <= 4; fm++) {
    for (let rr = 1; rr <= 4; rr++) {

      progress++;
      setStatus(`取得中 ${progress}/16 (fm=${fm}, rr=${rr})`);

      let pg = 0;

      while (pg < MAX_PAGES) {
        const html = await postSearch(fm, rr, pg);
        const { items, hasNext } = parsePage(html);

        for (const item of items) {
          if (!seen.has(item.href)) {
            seen.add(item.href);
            allItems.push(item);
          }
        }

        await randomWait();

        if (!hasNext) break;
        pg++;
      }
    }
  }

  /* ========= 整列 & 表示 ========= */

  setStatus(`整列中… (${allItems.length}件)`);

  allItems.sort((a, b) => b.tm - a.tm);

  const ul = document.createElement("ul");
  ul.style.cssText = `
    list-style:none;
    padding:0;
    margin:0;
    display:flex;
    flex-direction:column;
    gap:8px;
  `;

  for (const item of allItems) {
    const li = document.createElement("li");
    li.style.cssText = `
      background:#0006;
      border:1px solid #fff2;
      border-radius:12px;
      padding:8px;
    `;
    li.innerHTML = item.html;
    ul.appendChild(li);
  }

  bodyEl.appendChild(ul);

  setStatus(`完了 ${allItems.length}件`);
})();
