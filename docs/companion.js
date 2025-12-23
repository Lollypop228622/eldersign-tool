(() => {
  const PANEL_ID = "__es_companion_dispatch";
  const TARGETS = ["攻撃", "魔力", "防御", "命中", "敏捷"];

  const GRID = [
    [
      { label: "魔獣", stat: "攻撃", t: 0 },
      { label: "竜　", stat: "攻撃", t: 1 },
      { label: "象牙", stat: "敏捷", t: 2 },
    ],
    [
      { label: "妖精", stat: "魔力", t: 3 },
      { label: "気象", stat: "敏捷", t: 4 },
      { label: "術式", stat: "魔力", t: 5 },
    ],
    [
      { label: "混沌", stat: "防御", t: 6 },
      { label: "緑　", stat: "防御", t: 7 },
      { label: "星辰", stat: "命中", t: 8 },
    ],
    [
      { label: "投資", stat: "命中", t: 9 },
      { label: "アクア", stat: "敏捷", t: 10 },
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

  function renderPanel(linesHtml) {
    document.getElementById(PANEL_ID)?.remove();

    const box = document.createElement("div");
    box.id = PANEL_ID;
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,.8);" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "font-size:14px;max-width:90%;";

    const pre = document.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre;";
    pre.innerHTML = linesHtml.join("\n");
    box.appendChild(pre);

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

    const SCORE_WIDTH = 4;
    const LABEL_WIDTH = 2;

    const padRight = (text, width) => {
      const pad = Math.max(0, width - text.length);
      return text + "&nbsp;".repeat(pad);
    };

    const cid = getCid();
    const mkLink = (text, t) => {
      if (!cid) return text;
      return (
        `<a href="https://eldersign.jp/union_facility?cmd=v&t=${t}&cid=${cid}&pg=0&r=t" ` +
        `style="color:inherit;text-decoration:none;">${text}</a>`
      );
    };

    const lines = [];
    lines.push('<span style="display:block;text-align:center;">研究力</span>');
    GRID.forEach((row, rowIdx) => {
      const scoreLine = row
        .map((cell, colIdx) => {
          const score = calcResearch(grade, level, stats[cell.stat]);
          const scoreText = `[${String(score).padStart(2, " ")}]`;
          return padRight(mkLink(scoreText, cell.t), SCORE_WIDTH);
        })
        .join("&nbsp;&nbsp;");

      const labelLine = row
        .map((cell, colIdx) => padRight(mkLink(cell.label, cell.t), LABEL_WIDTH))
        .join("&nbsp;&nbsp;");

      lines.push(scoreLine);
      lines.push(labelLine);
      if (rowIdx < GRID.length - 1) lines.push("");
    });

    renderPanel(lines);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
