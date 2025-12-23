(() => {
  const PANEL_ID = "__es_companion_dispatch";
  const TARGETS = ["攻撃", "魔力", "防御", "命中", "敏捷"];

  const GRID = [
    [
      { label: "魔獣", stat: "攻撃", t: 0 },
      { label: "竜", stat: "攻撃", t: 1 },
      { label: "象牙", stat: "敏捷", t: 2 },
    ],
    [
      { label: "妖精", stat: "魔力", t: 3 },
      { label: "気象", stat: "敏捷", t: 4 },
      { label: "術式", stat: "魔力", t: 5 },
    ],
    [
      { label: "混沌", stat: "防御", t: 6 },
      { label: "緑", stat: "防御", t: 7 },
      { label: "星辰", stat: "命中", t: 8 },
    ],
    [
      { label: "投資", stat: "命中", t: 9 },
      { label: "アクア", stat: "敏捷", t: 10 },
      { label: "", stat: null, t: null },
    ],
  ];

  function getLevel() {
    const h3 =
      document.querySelector("div.card_d header.card h3") ||
      document.querySelector("h3");
    if (!h3) return null;
    const m = h3.textContent.match(/Lv\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function getGrade() {
    const gradeImg = document.querySelector('img[src*="/img/menu/grade_"]');
    if (!gradeImg) return null;
    const m = gradeImg.src.match(/grade_(\d+)\.png/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function getStatusRows() {
    const cap = [...document.querySelectorAll("div.status table caption")].find(
      (c) => c.textContent.trim() === "ステータス"
    );
    if (!cap) return null;
    return [...cap.closest("table").querySelectorAll("tbody tr")];
  }

  function collectStats(rows) {
    const stats = {};
    rows.forEach((tr) => {
      const cells = Array.from(tr.children);
      for (let i = 0; i + 1 < cells.length; i += 2) {
        const label = cells[i].textContent.trim();
        const valueText = cells[i + 1].textContent.trim();
        if (!TARGETS.includes(label)) continue;
        const value = parseInt(valueText.replace(/[^\d\-]/g, ""), 10);
        if (Number.isFinite(value)) stats[label] = value;
      }
    });
    return stats;
  }

  function calcResearch(grade, level, stat) {
    return Math.floor(grade * level + stat / 100);
  }

  function getCid() {
    const fromUrl = new URL(location.href).searchParams.get("cid");
    if (fromUrl) return fromUrl;

    const link = document.querySelector('a[href*="cid="]');
    if (!link) return null;
    try {
      return new URL(link.href, location.href).searchParams.get("cid");
    } catch {
      return null;
    }
  }

  function renderPanel(content) {
    document.getElementById(PANEL_ID)?.remove();

    const box = document.createElement("div");
    box.id = PANEL_ID;
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,.8);" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "font-size:14px;max-width:90%;";

    box.appendChild(content);

    box.onclick = () => box.remove();
    document.body.appendChild(box);
  }

  try {
    const level = getLevel();
    const grade = getGrade();
    const rows = getStatusRows();

    if (!rows) {
      alert("コンパニオン画面で使用してください");
      return;
    }
    if (level == null) {
      alert("レベル情報が見つかりません");
      return;
    }
    if (grade == null) {
      alert("グレード情報が見つかりません");
      return;
    }

    const stats = collectStats(rows);
    const missing = TARGETS.filter((k) => stats[k] == null);
    if (missing.length) {
      alert("ステータスの取得に失敗しました: " + missing.join(" / "));
      return;
    }

    const cid = getCid();
    const mkLinkEl = (text, t) => {
      if (!cid) {
        const span = document.createElement("span");
        span.textContent = text;
        return span;
      }
      const a = document.createElement("a");
      a.href = `https://eldersign.jp/union_facility?cmd=v&t=${t}&cid=${cid}&pg=0&r=t`;
      a.textContent = text;
      a.style.cssText = "color:inherit;text-decoration:none;";
      return a;
    };

    const SCORE_WIDTH = 2; // 2桁固定（1桁は空白）

    const content = document.createElement("div");
    content.style.cssText = "display:flex;flex-direction:column;gap:8px;";

    const title = document.createElement("div");
    title.textContent = "研究力";
    title.style.cssText = "text-align:center;";
    content.appendChild(title);

    GRID.forEach((row, rowIdx) => {
      const rowEl = document.createElement("div");
      rowEl.style.cssText =
        "display:grid;grid-template-columns:repeat(3, minmax(0,1fr));" +
        "gap:10px;text-align:center;";

      row.forEach((cell) => {
        const cellEl = document.createElement("div");
        cellEl.style.cssText =
          "display:flex;flex-direction:column;align-items:center;gap:2px;";

        if (!cell.stat) {
          rowEl.appendChild(cellEl);
          return;
        }

        const score = calcResearch(grade, level, stats[cell.stat]);
        const scoreText = `[${String(score).padStart(SCORE_WIDTH, " ")}]`;
        const scoreEl = mkLinkEl(scoreText, cell.t);
        scoreEl.style.cssText += "display:inline-block;min-width:2ch;text-align:center;";

        const labelEl = mkLinkEl(cell.label, cell.t);
        labelEl.style.cssText += "display:inline-block;min-width:2em;text-align:center;";

        cellEl.appendChild(scoreEl);
        cellEl.appendChild(labelEl);
        rowEl.appendChild(cellEl);
      });

      content.appendChild(rowEl);
      if (rowIdx < GRID.length - 1) {
        const spacer = document.createElement("div");
        spacer.style.cssText = "height:6px;";
        content.appendChild(spacer);
      }
    });

    renderPanel(content);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
