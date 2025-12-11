(function () {
  try {
    // ステータス表の caption=ステータス を探す
    var capEls = Array.from(document.querySelectorAll('div.status table caption'));
    var cap = capEls.find(function (c) {
      return c.textContent.trim() === 'ステータス';
    });
    if (!cap) {
      alert('ステータス表が見つかりません');
      return;
    }

    var table = cap.closest('table');
    var rows = Array.from(table.querySelectorAll('tbody tr'));
    var targets = ['HP', '攻撃', '魔力', '防御', '命中', '敏捷'];
    var lines = [];

    var sumSq = 0;   // 上昇率(小数)² の合計
    var count = 0;   // カウント（実際に評価に使ったステータス数）

    rows.forEach(function (tr) {
      var th = tr.querySelector('th');
      if (!th) return;

      var label = th.textContent.trim();
      if (targets.indexOf(label) === -1) return;

      // HP だけ全角表記
      var dlabel = (label === 'HP') ? 'ＨＰ' : label;

      var tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;

      var val = tds[0].textContent.trim();
      var bonusTxt = tds[1].textContent.trim();

      // 現在値（"2086/2086" → 2086）
      var current = parseInt(val.split('/')[0].replace(/[^\d\-]/g, ''), 10);
      if (isNaN(current)) return;

      // 上昇値 "(+186)" → 186
      var m = bonusTxt.match(/([+-]?\d+)/);
      var bonus = m ? parseInt(m[1], 10) : 0;

      var base = current - bonus;
      if (base <= 0) return; // 変な値は無視

      // 上昇率（％）
      var pct = bonus / base * 100;
      // 表示用：小数1桁、10未満は頭にスペースで桁揃え
      var pctStr = (Math.abs(pct) < 10 ? ' ' : '') + pct.toFixed(1);

      // 基礎値：5 - 桁数分のスペース
      var baseStr = String(base);
      var basePad = ' '.repeat(Math.max(0, 5 - baseStr.length));

      // 上昇値：4 - 桁数分のスペース
      var bonusStr = String(bonus);
      var bonusPad = ' '.repeat(Math.max(0, 4 - bonusStr.length));

      // 行を追加
      lines.push(
        dlabel + ':' +
        basePad + baseStr +
        '+' + bonusPad + bonusStr +
        ' (+' + pctStr + '%)'
      );

      // 評価値用に小数上昇率を利用（例：12.3% → 0.123）
      var r = pct / 100;
      sumSq += r * r;
      count++;
    });

    lines.push('-----------------------');

    // 評価値計算
    var evalValue = 10.0;
    if (count > 0) {
      var rms = Math.sqrt(sumSq / count);  // 平方平均
      evalValue = rms * 200 + 10;
    }
    lines.push('評価値: ' + evalValue.toFixed(1));

    // 右上に表示用のボックスを作成
    var box = document.createElement('div');
    box.style.cssText =
      'position:fixed;top:10px;right:10px;z-index:99999;' +
      'background:rgba(0,0,0,0.8);color:white;padding:10px 15px;' +
      'border-radius:8px;font-family:monospace;white-space:pre;' +
      'max-width:90%;cursor:pointer;font-size:14px;';
    box.textContent = lines.join('\n');
    box.onclick = function () { box.remove(); };
    document.body.appendChild(box);
  } catch (e) {
    alert('エラー:' + e.message);
  }
})();
