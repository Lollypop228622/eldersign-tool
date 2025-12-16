(() => {
  // =========================
  // 設定
  // =========================
  const Z_INDEX = 2147483647;
  const STORAGE_KEY = "__es_bazaar_ui_v5";
  const WANT_H = 960;

  const STYLE_ID = "__es_chip_style";
  const PANEL_ID = "__es_chip_panel";
  const IFRAME_ID = "__es_post_iframe";

  // =========================
  // 対象フォーム取得
  // =========================
  const FORM = document.querySelector(
    'form[method="post"][action^="https://eldersign.jp/bazaar"]'
  );
  if (!FORM) {
    alert("対象フォームが見つかりません");
    return;
  }

  const selectInForm = (name) => FORM.querySelector(`select[name="${name}"]`);
  const FM = selectInForm("fm"); // ファミリー
  const RR = selectInForm("rr"); // レアリティ

  if (!FM || !RR) {
    alert("fm / rr の select が見つかりません");
    return;
  }

  // =========================
  // localStorage
  // =========================
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const save = (obj) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  };

  const saved = load();

  // 指定値が option として存在する場合のみ反映
  const applyIfExists = (sel, val) => {
    if (val == null) return;
    const v = String(val);
    if (sel.querySelector(`option[value="${CSS.escape(v)}"]`)) {
      sel.value = v;
    }
  };

  applyIfExists(FM, saved.fm);
  applyIfExists(RR, saved.rr);

  // =========================
  // サイズ計算
  // =========================
  const isMobile =
    matchMedia("(pointer:coarse)").matches ||
    Math.min(screen.width, screen.height) <= 820;

  let W = Number(saved.w) || (isMobile ? 360 : 440);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const persist = (H) => {
    save({
      fm: FM.value,
      rr: RR.value,
      w: W,
      h: H,
    });
  };

  // =========================
  // スタイル注入
  // =========================
  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID}{
  font:12.5px/1.2 system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif
}
#${PANEL_ID} .head{
  display:flex;align-items:center;justify-content:space-between;
  gap:6px;margin-bottom:3px
}
#${PANEL_ID} .title{font-weight:800;font-size:12.5px}
#${PANEL_ID} .row{
  display:flex;gap:5px;align-items:center;flex-wrap:wrap;
  margin:3px 0 5px
}
#${PANEL_ID} .ttl{
  font-weight:700;font-size:11px;color:#333;margin-right:2px
}
#${PANEL_ID} input[type=radio]{position:absolute;opacity:0;pointer-events:none}
#${PANEL_ID} label.chip{
  display:inline-flex;align-items:center;
  padding:4px 7px;border-radius:999px;
  border:1px solid rgba(0,0,0,.22);
  background:#fff;cursor:pointer;transition:.15s
}
#${PANEL_ID} label.chip:hover{box-shadow:0 3px 8px rgba(0,0,0,.12)}
#${PANEL_ID} input:checked+label.chip{background:#111;color:#fff;border-color:#111}
#${PANEL_ID} button{
  all:unset;cursor:pointer;padding:4px 8px;border-radius:999px;
  border:1px solid rgba(0,0,0,.2);background:#fff;font-weight:700
}
#${PANEL_ID} button:hover{box-shadow:0 3px 8px rgba(0,0,0,.12)}

/* --- レアリティ色 --- */
/* 錆びた青銅（緑青っぽい） */
#${PANEL_ID} label.r_bronze{background:rgba(90,140,120,.22)}
#${PANEL_ID} input:checked+label.r_bronze{
  background:rgba(90,140,120,.88);color:#fff;border-color:rgba(90,140,120,.88)
}
/* 銀 */
#${PANEL_ID} label.r_silver{background:rgba(160,160,160,.22)}
#${PANEL_ID} input:checked+label.r_silver{
  background:rgba(140,140,140,.90);color:#fff;border-color:rgba(140,140,140,.90)
}
/* 金 */
#${PANEL_ID} label.r_gold{background:rgba(212,175,55,.24)}
#${PANEL_ID} input:checked+label.r_gold{
  background:rgba(212,175,55,.92);color:#111;border-color:rgba(212,175,55,.92)
}
/* 白金（ピンクと紫の間） */
#${PANEL_ID} label.r_platinum{background:rgba(215,140,255,.22)}
#${PANEL_ID} input:checked+label.r_platinum{
  background:rgba(215,140,255,.90);color:#111;border-color:rgba(215,140,255,.90)
}

/* ★ 幅揃え（ファミリーもレアリティも） */
#${PANEL_ID} label.f_chip,
#${PANEL_ID} label.r_bronze,
#${PANEL_ID} label.r_silver,
#${PANEL_ID} label.r_gold,
#${PANEL_ID} label.r_platinum{
  min-width: 2.4em;
  justify-content: center;
  text-align: center;
}
`.trim();

    document.head.appendChild(style);
  };

  ensureStyle();

  // =========================
  // iframe / panel 作成
  // =========================
  let iframe = document.getElementById(IFRAME_ID);
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.name = IFRAME_ID;
    iframe.style.cssText = `
position:fixed;right:10px;bottom:10px;z-index:${Z_INDEX};
background:#fff;border:1px solid rgba(0,0,0,.25);
border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.28);
overflow:hidden`.trim();
    document.body.appendChild(iframe);
  }

  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = `
position:fixed;right:10px;z-index:${Z_INDEX};
background:rgba(255,255,255,.96);
backdrop-filter:saturate(1.2) blur(6px);
border:1px solid rgba(0,0,0,.18);
border-radius:14px;
box-shadow:0 10px 28px rgba(0,0,0,.18);
padding:7px 7px 6px;color:#111`.trim();
    document.body.appendChild(panel);
  }

  // =========================
  // ユーティリティ
  // =========================
  const optList = (sel) =>
    Array.from(sel.options).map((o) => ({
      v: o.value,
      t: (o.textContent || "").trim(),
    }));

  // submit連打を避けるためのデバウンス
  const submit = (() => {
    let t = 0;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => {
        FORM.setAttribute("target", IFRAME_ID);
        FORM.submit();
      }, 80);
    };
  })();

  // レアリティ表示（銀/金はスペースなし）
  const rarityText = (t) =>
    t === "ブロンズ"
      ? "青銅"
      : t === "シルバー"
      ? "銀"
      : t === "ゴールド"
      ? "金"
      : t === "プラチナ"
      ? "白金"
      : t;

  // レアリティの色クラス
  const rarityClass = (v) =>
    String(v) === "1"
      ? "r_bronze"
      : String(v) === "2"
      ? "r_silver"
      : String(v) === "3"
      ? "r_gold"
      : String(v) === "4"
      ? "r_platinum"
      : "";

  // =========================
  // 破棄（閉じる）
  // =========================
  const teardown = () => {
    try {
      document.getElementById(PANEL_ID)?.remove();
    } catch {}
    try {
      document.getElementById(IFRAME_ID)?.remove();
    } catch {}
    try {
      document.getElementById(STYLE_ID)?.remove();
    } catch {}
  };

  // =========================
  // iframe内遷移の抑止 & 親へ遷移
  // =========================
  const installIframeHijack = () => {
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;

      // 同じドキュメントに二重登録しない
      if (doc.__esHijackInstalled) return;
      doc.__esHijackInstalled = true;

      // aクリックを親へ
      doc.addEventListener(
        "click",
        (e) => {
          const a = e.target?.closest?.("a[href]");
          if (!a) return;

          const href = a.getAttribute("href");
          if (!href || href.startsWith("#") || href.startsWith("javascript:"))
            return;

          const url = new URL(href, win.location.href).toString();

          e.preventDefault();
          e.stopPropagation();

          teardown();
          window.location.href = url;
        },
        true
      );

      // form送信を親へ（GET/POST両対応）
      doc.addEventListener(
        "submit",
        (e) => {
          const form = e.target;
          if (!(form instanceof HTMLFormElement)) return;

          e.preventDefault();
          e.stopPropagation();

          const method = (form.getAttribute("method") || "GET").toUpperCase();
          const action = form.getAttribute("action") || win.location.href;
          const actionUrl = new URL(action, win.location.href).toString();

          teardown();

          if (method === "GET") {
            const params = new URLSearchParams(new FormData(form));
            const u = new URL(actionUrl);
            params.forEach((v, k) => u.searchParams.append(k, v));
            window.location.href = u.toString();
            return;
          }

          // POSTは親ページで再現して送る
          const f = document.createElement("form");
          f.method = "POST";
          f.action = actionUrl;
          f.style.display = "none";

          for (const [k, v] of new FormData(form).entries()) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            input.value = String(v);
            f.appendChild(input);
          }

          document.body.appendChild(f);
          f.submit();
        },
        true
      );
    } catch {
      // 別オリジンなどで触れない場合は何もしない
    }
  };

  // iframeのロードごとに仕込む
  iframe.addEventListener("load", installIframeHijack);

  // =========================
  // Chipsグループ生成
  // =========================
  const mkGroup = (name, title, opts, cur, onChange, textFn, labelClassFn) => {
    const d = document.createElement("div");
    d.className = "row";

    const tt = document.createElement("div");
    tt.className = "ttl";
    tt.textContent = title;
    d.appendChild(tt);

    opts.forEach((o, i) => {
      const id = `${name}_${i}_${Math.random().toString(36).slice(2, 6)}`;

      const r = document.createElement("input");
      r.type = "radio";
      r.name = name;
      r.id = id;
      r.value = o.v;
      r.checked = String(o.v) === String(cur);
      r.onchange = () => {
        if (r.checked) onChange(o.v);
      };

      const l = document.createElement("label");
      l.className = "chip";

      // ★ ファミリーも幅揃え対象にするためクラス付与
      if (name === "es_fm") l.className += " f_chip";

      const extra = labelClassFn ? labelClassFn(o.v, o.t) : "";
      if (extra) l.className += ` ${extra}`;

      l.htmlFor = id;
      l.textContent = textFn ? textFn(o.t, o.v) : o.t;

      d.appendChild(r);
      d.appendChild(l);
    });

    return d;
  };

  // =========================
  // 描画
  // =========================
  const render = () => {
    panel.innerHTML = "";

    const head = document.createElement("div");
    head.className = "head";

    const ttl = document.createElement("div");
    ttl.className = "title";
    ttl.textContent = "Eldersign 検索（Chips）";

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "4px";

    const b1 = document.createElement("button");
    b1.textContent = "検索";
    b1.onclick = () => submit();

    const b2 = document.createElement("button");
    b2.textContent = "閉じる";
    b2.onclick = () => teardown();

    btns.appendChild(b1);
    btns.appendChild(b2);

    head.appendChild(ttl);
    head.appendChild(btns);

    panel.appendChild(head);

    // ファミリー
    panel.appendChild(
      mkGroup("es_fm", "ファミリー", optList(FM), FM.value, (v) => {
        FM.value = v;
        persist(parseFloat(iframe.style.height) || 0);
        submit();
      })
    );

    // レアリティ
    panel.appendChild(
      mkGroup(
        "es_rr",
        "レアリティ",
        optList(RR),
        RR.value,
        (v) => {
          RR.value = v;
          persist(parseFloat(iframe.style.height) || 0);
          submit();
        },
        (t) => rarityText(t),
        (v) => rarityClass(v)
      )
    );
  };

  render();

  // =========================
  // レイアウト（画面に収まる高さへ）
  // =========================
  const layout = () => {
    W = clamp(W, 320, Math.max(320, window.innerWidth - 40));
    panel.style.width = `${W}px`;
    iframe.style.width = `${W}px`;

    const panelH = panel.getBoundingClientRect().height;
    const maxH = window.innerHeight - panelH - 34;

    const H = clamp(Math.min(WANT_H, maxH), 260, maxH);

    iframe.style.height = `${H}px`;
    panel.style.bottom = `${H + 14}px`;

    persist(H);
  };

  layout();
  window.addEventListener("resize", layout, { passive: true });

  // 初回表示で検索（白紙対策）
  FORM.setAttribute("target", IFRAME_ID);
  submit();

  // ロード済みだった場合に備えて一度トライ
  installIframeHijack();
})();
