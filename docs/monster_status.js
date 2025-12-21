(function () {
  const RARITY = Object.freeze({
    BRONZE: "BRONZE",
    SILVER: "SILVER",
    GOLD: "GOLD",
    PLATINUM: "PLATINUM",
  });

  const RARITY_BY_MAX_LEVEL = Object.freeze({
    30: RARITY.BRONZE,
    50: RARITY.SILVER,
    70: RARITY.GOLD,
    90: RARITY.PLATINUM,
  });

  const GROWTH_COEFF_BY_RARITY = Object.freeze({
    [RARITY.BRONZE]: 1.0,
    [RARITY.SILVER]: 1.5,
    [RARITY.GOLD]: 2.0,
    [RARITY.PLATINUM]: 2.5,
  });

  const EXP_COEFF_BY_RARITY = Object.freeze({
    [RARITY.BRONZE]: 1,
    [RARITY.SILVER]: 2,
    [RARITY.GOLD]: 4,
    [RARITY.PLATINUM]: 8,
  });

  const TARGETS = ["HP", "攻撃", "魔力", "防御", "命中", "敏捷"];

  function getLevelInfo() {
    const h3 =
      document.querySelector("div.card_d header.card h3") ||
      document.querySelector("h3");
    if (!h3) {
      alert("レベル情報が見つかりません");
      return null;
    }

    const mLv = h3.textContent.match(/Lv\s*(\d+)\s*\/\s*(\d+)/i);
    if (!mLv) {
      alert("Lv/最大Lv形式が見つかりません");
      return null;
    }

    return { level: parseInt(mLv[1], 10), maxLevel: parseInt(mLv[2], 10) };
  }

  function getRarity(maxLevel) {
    return RARITY_BY_MAX_LEVEL[maxLevel] ?? RARITY.BRONZE;
  }

  function getGrowth(level, maxLevel, rarity) {
    const rc = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const t = Math.max(0, (level - 1) / (maxLevel - 1));
    const G = 1 + rc * t;
    return { G, sqrtG: Math.sqrt(G) };
  }

  function estimateLv1Base(currentTotal, bonus, isHP, level, G, sqrtG) {
    if (currentTotal <= 0) return 0;
    if (level <= 1) return Math.max(1, currentTotal - bonus);

    const factor = isHP ? sqrtG : G;
    if (!isFinite(factor) || factor <= 0) return Math.max(1, currentTotal - bonus);

    const approx = currentTotal / factor - bonus;

    let best = Math.max(1, Math.floor(approx));
    let bestDiff = Math.abs(Math.floor((best + bonus) * factor) - currentTotal);
    let maxExact = null;

    const start = Math.max(1, Math.floor(approx) - 50);
    const end = Math.floor(approx) + 50;

    for (let cand = start; cand <= end; cand++) {
      const sim = Math.floor((cand + bonus) * factor);
      const diff = Math.abs(sim - currentTotal);

      if (sim === currentTotal) {
        if (maxExact === null || cand > maxExact) maxExact = cand;
        continue;
      }
      if (diff < bestDiff) {
        bestDiff = diff;
        best = cand;
      }
    }
    return maxExact !== null ? maxExact : best;
  }

  function getStatusRows() {
    const cap = [...document.querySelectorAll("div.status table caption")].find(
      (c) => c.textContent.trim() === "ステータス"
    );
    if (!cap) {
      alert("モンスター画面で使用してください");
      return null;
    }
    return [...cap.closest("table").querySelectorAll("tbody tr")];
  }

  function collectStats(rows, level, G, sqrtG) {
    const lines = [];
    let sumSq = 0;
    const statInfo = {};

    rows.forEach((tr) => {
      const th = tr.querySelector("th");
      if (!th) return;

      const label = th.textContent.trim();
      if (!TARGETS.includes(label)) return;

      const isHP = label === "HP";
      const name = isHP ? "ＨＰ" : label;

      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) return;

      const statText = tds[0].textContent.trim();
      const bonusText = tds[1].textContent.trim();

      const parts = statText.split("/");
      const usedPart = isHP && parts.length >= 2 ? parts[1] : parts[0];
      const currentTotal = parseInt(usedPart.replace(/[^\d\-]/g, ""), 10);
      if (isNaN(currentTotal)) return;

      const m = bonusText.match(/([+-]?\d+)/);
      const bonus = m ? parseInt(m[1], 10) : 0;

      const base = estimateLv1Base(currentTotal, bonus, isHP, level, G, sqrtG);
      if (base <= 0) return;

      const r = bonus / base;
      const pct = r * 100;

      const pctStr = String(pct.toFixed(1)).padStart(4, " ");
      const basePad = " ".repeat(Math.max(0, 5 - String(base).length));
      const bonusPad = " ".repeat(Math.max(0, 4 - String(bonus).length));

      lines.push(`${name}:${basePad}${base}+${bonusPad}${bonus} (${pctStr}%)`);

      sumSq += r * r;
      statInfo[label] = { name, base, bonus, r };
    });

    return { lines, sumSq, statInfo };
  }

  function calcEval(sumSq) {
    const raw = Math.sqrt(sumSq / 6) * 200 + 10;
    return Math.floor(raw * 10) / 10;
  }

  function getGrade() {
    const gradeImg = document.querySelector('img[src*="/img/menu/grade_"]');
    if (!gradeImg) return null;
    const gm = gradeImg.src.match(/grade_(\d+)\.png/i);
    return gm ? parseInt(gm[1], 10) : null;
  }

  function buildNextGradeLines(statInfo, evalValue) {
    const currentTens = Math.floor(evalValue / 10);
    const target = (currentTens + 1) * 10;

    function rawEval(sumR2) {
      return Math.sqrt(sumR2 / 6) * 200 + 10;
    }

    function sumR2Override(label, newB) {
      let s = 0;
      for (const k of TARGETS) {
        const info = statInfo[k];
        if (!info) continue;
        const b = k === label ? newB : info.bonus;
        const r = b / info.base;
        s += r * r;
      }
      return s;
    }

    function findMin(label) {
      const info = statInfo[label];
      if (!info) return null;

      let S = 0;
      for (const k of TARGETS) {
        if (k === label) continue;
        const o = statInfo[k];
        if (o) S += o.r * o.r;
      }

      const k = (target - 10) / 200;
      const need = Math.max(0, 6 * k * k - S);
      let start = Math.max(info.bonus, Math.ceil(Math.sqrt(need) * info.base) - 3);

      for (let b = start; b <= info.bonus + 20000; b++) {
        if (rawEval(sumR2Override(label, b)) >= target) return b;
      }
      return null;
    }

    const pad4 = (n) => String(n).padStart(4, " ");
    const pad3 = (n) => String(n).padStart(3, " ");
    const padPct = (x) => String(x.toFixed(1)).padStart(4, " ");

    const lines = [];
    lines.push("-----------------------");
    lines.push("次のグレードになるには");
    for (const label of TARGETS) {
      const info = statInfo[label];
      if (!info) continue;

      const b = findMin(label);
      if (b == null) continue;

      const pct = (b / info.base) * 100;
      const delta = b - info.bonus;

      lines.push(`${info.name}なら${pad4(b)}(${padPct(pct)}%) あと${pad3(delta)}`);
    }

    return lines;
  }

  function renderPanel(lines, nextGradeLines) {
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,.8);" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "font-size:14px;max-width:90%;";

    const pre = document.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre;";
    pre.textContent = lines.join("\n");
    box.appendChild(pre);

    const toggleWrap = document.createElement("div");
    toggleWrap.style.cssText = "margin-top:8px;text-align:right;";
    box.appendChild(toggleWrap);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "もっと見る";
    toggle.style.cssText = "font-size:12px;cursor:pointer;";
    toggleWrap.appendChild(toggle);

    let opened = false;
    toggle.onclick = () => {
      if (opened) return;
      const nextPre = document.createElement("pre");
      nextPre.style.cssText = "margin:8px 0 0;white-space:pre;";
      nextPre.textContent = nextGradeLines.join("\n");
      box.appendChild(nextPre);
      toggleWrap.remove();
      opened = true;
    };

    box.onclick = (e) => {
      if (e.target === toggle) return;
      box.remove();
    };
    document.body.appendChild(box);
  }

  try {
    const levelInfo = getLevelInfo();
    if (!levelInfo) return;

    const { level, maxLevel } = levelInfo;
    const rarity = getRarity(maxLevel);
    const { G, sqrtG } = getGrowth(level, maxLevel, rarity);
    const expRarityFactor = EXP_COEFF_BY_RARITY[rarity] ?? 1;

    const rows = getStatusRows();
    if (!rows) return;

    const { lines, sumSq, statInfo } = collectStats(rows, level, G, sqrtG);
    const evalValue = calcEval(sumSq);
    const grade = getGrade();

    lines.push("-----------------------");
    lines.push("評価値: " + evalValue.toFixed(1));

    if (grade != null) {
      const baseExp = expRarityFactor * grade * ((level + 4) / 5) * 16;
      const expO = Math.floor(baseExp);
      const expS = Math.floor(baseExp * 1.125);
      lines.push(`経験値: 異${expO} / 同${expS}`);
    } else {
      lines.push("経験値: 取得失敗");
    }

    const nextGradeLines = buildNextGradeLines(statInfo, evalValue);
    renderPanel(lines, nextGradeLines);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
