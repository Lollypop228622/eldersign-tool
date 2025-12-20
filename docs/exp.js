(() => {
  const RARITY_MAP = { b: 1, s: 2, g: 4, p: 8 };

  function getRarity(li) {
    const img = li.querySelector('img[src*="https://eldersign.jp/img/mi/"]');
    if (!img) return null;
    const m = img.src.match(/\/mi\/([a-z])\//i);
    return m ? RARITY_MAP[m[1].toLowerCase()] ?? null : null;
  }

  function getGrade(li) {
    const img = li.querySelector('img[src*="grade_"]');
    if (!img) return null;
    const m = img.src.match(/grade_(\d+)\.png/i);
    return m ? Number(m[1]) : null;
  }

  function getLevel(li) {
    const text = li.innerText || '';
    const m = text.match(/Lv\s*(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function getPriceAny(li) {
    const p = li.querySelector('p.price');
    if (!p) return null;
    const m = (p.textContent || '').match(/価格\s*:\s*([\d,]+)\s*Any/i);
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const calcBaseRaw = (r, g, l) => r * g * ((l + 4) / 5) * 16;

  const formatRate = x =>
    (Math.round(x * 1000) / 1000).toFixed(3).replace(/\.?0+$/, '');

  function upsertExpThenEff(li, baseRaw) {
    const diff = Math.floor(baseRaw);
    const same = Math.floor(baseRaw * 1.125);
    const price = getPriceAny(li);

    let expP = [...li.querySelectorAll('p')]
      .find(p => /^経験値\s*[:：]/.test(p.textContent));
    let effP = [...li.querySelectorAll('p')]
      .find(p => /^効率\s*\(1Any\)/.test(p.textContent));

    if (!expP) expP = document.createElement('p');
    expP.textContent = `経験値: 異種族${diff} / 同種族${same}`;

    if (price != null) {
      if (!effP) effP = document.createElement('p');
      effP.textContent =
        `効率(1Any): 異種族${formatRate(diff / price)} / ` +
        `同種族${formatRate(same / price)}`;
      li.dataset.effSame = (same / price).toString();
      li.dataset.effDiff = (diff / price).toString();
    } else {
      if (effP) effP.remove();
      delete li.dataset.effSame;
      delete li.dataset.effDiff;
    }

    const priceP = li.querySelector('p.price');
    const ps = li.querySelectorAll('p');
    const anchor = priceP ?? ps[ps.length - 1];

    // 経験値 → 効率 の順で挿入
    anchor ? anchor.after(expP) : li.appendChild(expP);
    if (price != null) expP.after(effP);
  }

  const ul = document.querySelector('nav.block ul');
  if (!ul) return;

  const lis = Array.from(ul.children);

  // 表示更新
  lis.forEach(li => {
    const r = getRarity(li);
    const g = getGrade(li);
    const l = getLevel(li);
    if (r == null || g == null || l == null) return;
    upsertExpThenEff(li, calcBaseRaw(r, g, l));
  });

  // 価格が1件も無ければソートしない
  if (!lis.some(li => li.dataset.effSame != null)) return;

  const withPrice = [];
  const withoutPrice = [];

  lis.forEach(li => {
    if (li.dataset.effSame != null) withPrice.push(li);
    else withoutPrice.push(li);
  });

  withPrice.sort((a, b) =>
    Number(b.dataset.effSame) - Number(a.dataset.effSame) ||
    Number(b.dataset.effDiff) - Number(a.dataset.effDiff)
  );

  [...withPrice, ...withoutPrice].forEach(li => ul.appendChild(li));
})();
