(() => {
  const LINKS = [
    ...document.querySelectorAll('nav.block ul > li > a[href*="tm="]')
  ];

  if (!LINKS.length) {
    alert("バザーの一覧が見つかりません");
    return;
  }

  const STYLE_ID = "__es_bazaar_time_style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.es-bazaar-time{
  font-size:12px;
  color:#333;
  margin:2px 0 0 78px;
}
`.trim();
    document.head.appendChild(style);
  }

  const fmt = (tm) => {
    if (!Number.isFinite(tm) || tm <= 0) return "";
    const date = new Date(tm * 1000);
    return date.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const REMAIN_MS = 7 * 24 * 60 * 60 * 1000;

  const fmtRemain = (tm) => {
    if (!Number.isFinite(tm) || tm <= 0) return "";
    const end = tm * 1000 + REMAIN_MS;
    const diff = end - Date.now();
    if (diff <= 0 || diff >= 24 * 60 * 60 * 1000) return "";
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  let added = 0;

  for (const a of LINKS) {
    if (a.querySelector(".es-bazaar-time")) continue;
    const url = new URL(a.href, location.href);
    const tm = Number(url.searchParams.get("tm"));
    const text = fmt(tm);
    if (!text) continue;

    const line = document.createElement("p");
    line.className = "es-bazaar-time";
    line.textContent = `出品: ${text}`;

    const remainText = fmtRemain(tm);
    if (remainText) {
      const remain = document.createElement("span");
      remain.textContent = ` 残り${remainText}`;
      remain.style.color = "#a00000";
      line.appendChild(remain);
    }

    const price = a.querySelector(".b .price");
    if (price) {
      price.insertAdjacentElement("afterend", line);
    } else {
      a.appendChild(line);
    }
    added++;
  }

  if (!added) {
    alert("出品時間を追加できませんでした");
  }
})();
