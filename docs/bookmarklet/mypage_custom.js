(async function () {
  const TARGET_SELECTOR = "nav.cards";
  const STYLE_ID = "es-carousel-style";
  const CAROUSEL_CLASS = "es-carousel";
  let slideCount = 3;
  const SWIPE_THRESHOLD = 0.2;
  const NOTICE_STYLE_ID = "eldersign-mypage-alert-style";
  const NOTICE_PREFIXES = ["①", "②", "③", "④"];

  if (document.querySelector(`.${CAROUSEL_CLASS}`)) {
    alert("カルーセルはすでに表示されています");
    return;
  }

  const source = document.querySelector(TARGET_SELECTOR);
  if (!source) {
    alert("カード一覧が見つかりません");
    return;
  }

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".es-carousel{position:relative;overflow:visible;margin:6px 0 4px;" +
      "touch-action:pan-y;}" +
      ".es-carousel-track{display:flex;gap:6px;transition:transform .25s ease;will-change:transform;}" +
      ".es-carousel-slide{flex:0 0 auto;box-sizing:border-box;padding:4px 0;margin:0;" +
      "transform:scale(.9);transform-origin:center center;transition:transform .25s ease;}" +
      ".es-carousel-slide.is-active{transform:scale(1);}";
    document.head.appendChild(style);
  }

  const parent = source.parentNode;

  const carousel = document.createElement("div");
  carousel.className = CAROUSEL_CLASS;

  const track = document.createElement("div");
  track.className = "es-carousel-track";
  carousel.appendChild(track);

  const sourceStyle = window.getComputedStyle(source);
  carousel.style.backgroundColor = sourceStyle.backgroundColor;
  carousel.style.backgroundImage = sourceStyle.backgroundImage;
  carousel.style.backgroundRepeat = sourceStyle.backgroundRepeat;
  carousel.style.backgroundPosition = sourceStyle.backgroundPosition;
  carousel.style.backgroundSize = sourceStyle.backgroundSize;

  const clearBackground = (el) => {
    el.style.background = "transparent";
    el.style.backgroundImage = "none";
    el.style.backgroundColor = "transparent";
    el.style.border = "0";
    el.style.boxShadow = "none";
    el.style.margin = "0";
    el.style.padding = "0";
    el.style.display = "inline-flex";
    el.style.justifyContent = "center";
    el.style.width = "auto";
    el.style.maxWidth = "none";
  };

  const getCurrentPageIndex = () => {
    const img = document.querySelector('nav.party img[src*="party"]');
    if (!img) return 0;
    const match = img.src.match(/party(\d+)\.png/i);
    if (!match) return 0;
    const number = parseInt(match[1], 10);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, number - 1);
  };

  const getMaxPagesFromScore = () => {
    const section = document.querySelector("section.chr");
    if (!section) return 1;
    const scoreMatch = section.textContent.match(/スコア:\s*([\d,]+)/);
    if (!scoreMatch) return 1;
    const score = parseInt(scoreMatch[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(score)) return 1;
    if (score < 600) return 1;
    if (score < 10000) return 2;
    if (score < 100000) return 3;
    return 4;
  };

  const fetchPageDoc = async (pageIndex) => {
    const url = `${location.origin}/mypage?p=${pageIndex}`;
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`ページ取得に失敗: p=${pageIndex}`);
      }
      const html = await response.text();
      return new DOMParser().parseFromString(html, "text/html");
    } catch (error) {
      const host = location.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1";
      if (isLocal) {
        return document;
      }
      throw error;
    }
  };

  const extractCards = (doc, pageIndex) => {
    const cards = doc.querySelector(TARGET_SELECTOR);
    if (!cards) {
      throw new Error(`カード一覧が見つかりません: p=${pageIndex}`);
    }
    return cards;
  };

  const getPartyInfoFromRoot = (root) => {
    const party = root.querySelector("nav.party");
    if (!party) return null;
    const items = [...party.querySelectorAll("li")];
    if (items.length < 4) return null;
    return {
      icon: items[1].innerHTML,
      title: items[2].innerHTML,
    };
  };

  const applyPartyInfo = (info) => {
    const party = document.querySelector("nav.party");
    if (!party || !info) return;
    const items = [...party.querySelectorAll("li")];
    if (items.length < 4) return;
    items[1].innerHTML = info.icon;
    items[2].innerHTML = info.title;
  };

  const updateQuestLinks = (pageIndex) => {
    const targets = [
      'nav.tbl#imgbtn a[href^="https://eldersign.jp/quest"]',
      'section.npc a[href^="https://eldersign.jp/quest"]',
    ];
    targets.forEach((selector) => {
      const link = document.querySelector(selector);
      if (!link) return;
      if (!link.dataset.baseHref) {
        link.dataset.baseHref = link.getAttribute("href") || "";
      }
      const baseHref = link.dataset.baseHref;
      try {
        const url = new URL(baseHref);
        url.searchParams.set("p", String(pageIndex));
        link.setAttribute("href", url.toString());
      } catch (error) {
        const separator = baseHref.includes("?") ? "&" : "?";
        link.setAttribute("href", `${baseHref}${separator}p=${pageIndex}`);
      }
    });
  };

  const ensureNoticeStyle = () => {
    let style = document.getElementById(NOTICE_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = NOTICE_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent =
      ".eldersign-mypage-alert{display:inline-block;padding:6px 10px;" +
      "border-radius:8px;border:2px solid #d9534f;" +
      "background:linear-gradient(135deg,#fff4e5,#ffe3e3);" +
      "color:#b30000;font-weight:700;" +
      "box-shadow:0 4px 12px rgba(217,83,79,0.35);" +
      "animation:eldersignPulse 1.8s ease-in-out infinite;}" +
      ".eldersign-mypage-alert p:first-of-type{display:flex;align-items:center;" +
      "gap:6px;margin:6px;}" +
      ".eldersign-mypage-alert-icon{display:inline-flex;align-items:center;" +
      "justify-content:center;width:18px;height:18px;line-height:18px;" +
      "text-align:center;border-radius:50%;background:#d9534f;color:#fff;" +
      "font-weight:900;flex:0 0 auto;}" +
      "@keyframes eldersignPulse{0%,100%{transform:scale(1);" +
      "box-shadow:0 4px 12px rgba(217,83,79,0.35);}50%{transform:scale(1.03);" +
      "box-shadow:0 6px 18px rgba(217,83,79,0.45);}}" +
      "a[href=\"https://eldersign.jp/quest\"]{color:#000 !important;" +
      "font-weight:700;text-decoration:underline;text-underline-offset:2px;}" +
      "section.npc{cursor:pointer;}";
  };

  const collectNoticeLines = (root) => {
    const section = root.querySelector("section.npc");
    if (!section) return [];
    return [...section.querySelectorAll("p")]
      .filter((p) => !p.querySelector('a[href="https://eldersign.jp/quest"]'))
      .map((p) => p.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  };

  const hideQuestRow = () => {
    const paragraph = document.querySelector(
      'section.npc > p > a[href="https://eldersign.jp/quest"]'
    );
    if (!paragraph) return;
    paragraph.parentElement.style.display = "none";
  };

  const renderNoticeSummary = (linesByPage) => {
    const section = document.querySelector("section.npc");
    if (!section) return;
    const lines = [];
    linesByPage.forEach((pageLines, pageIndex) => {
      if (!pageLines || pageLines.length === 0) return;
      const prefix = NOTICE_PREFIXES[pageIndex] || `${pageIndex + 1}.`;
      pageLines.forEach((line) => {
        lines.push(`${prefix}${line}`);
      });
    });
    if (lines.length === 0) return;

    ensureNoticeStyle();
    section.classList.add("eldersign-mypage-alert");
    if (!section.dataset.eldersignQuestClick) {
      section.dataset.eldersignQuestClick = "1";
      section.addEventListener("click", () => {
        window.location.href = "https://eldersign.jp/quest";
      });
    }

    let firstParagraph = section.querySelector("p");
    if (!firstParagraph) {
      firstParagraph = document.createElement("p");
      section.appendChild(firstParagraph);
    }
    firstParagraph.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "eldersign-mypage-alert-icon";
    icon.textContent = "!";
    firstParagraph.appendChild(icon);

    const textWrap = document.createElement("span");
    lines.forEach((line, idx) => {
      if (idx > 0) textWrap.appendChild(document.createElement("br"));
      textWrap.appendChild(document.createTextNode(line));
    });
    firstParagraph.appendChild(textWrap);
  };

  parent.insertBefore(carousel, source);

  let index = 0;
  slideCount = getMaxPagesFromScore();
  const partyInfoByPage = new Array(slideCount);
  const noticeLinesByPage = new Array(slideCount);
  try {
    const current = getCurrentPageIndex();
    index = Math.min(current, slideCount - 1);
    const slides = new Array(slideCount);
    slides[current] = source;
    partyInfoByPage[current] = getPartyInfoFromRoot(document);
    noticeLinesByPage[current] = collectNoticeLines(document);

    for (let i = 0; i < slideCount; i++) {
      if (i === current) continue;
      const doc = await fetchPageDoc(i);
      const cards = extractCards(doc, i);
      slides[i] = cards;
      partyInfoByPage[i] = getPartyInfoFromRoot(doc);
      noticeLinesByPage[i] = collectNoticeLines(doc);
    }

    slides.forEach((cards) => {
      clearBackground(cards);
      const slide = document.createElement("div");
      slide.className = "es-carousel-slide";
      slide.appendChild(cards);
      track.appendChild(slide);
    });
  } catch (error) {
    alert(error.message);
    return;
  }

  const syncSlideWidth = () => {
    const width = source.scrollWidth || source.getBoundingClientRect().width || 1;
    track.querySelectorAll(".es-carousel-slide").forEach((slide) => {
      slide.style.width = `${width}px`;
    });
  };
  const getTrackStep = () => {
    const slide = track.querySelector(".es-carousel-slide");
    if (!slide) return 1;
    const width = slide.offsetWidth || 1;
    const styles = window.getComputedStyle(track);
    const gapValue = styles.columnGap || styles.gap || "0";
    const gap = parseFloat(gapValue) || 0;
    return width + gap;
  };
  const getBaseOffset = () => {
    const slide = track.querySelector(".es-carousel-slide");
    if (!slide) return 0;
    const width = slide.offsetWidth || 0;
    const containerWidth = carousel.clientWidth || 0;
    return Math.max(0, (containerWidth - width) / 2);
  };
  const update = () => {
    syncSlideWidth();
    const step = getTrackStep();
    const baseOffset = getBaseOffset();
    track.style.transform = `translateX(${-(index * step) + baseOffset}px)`;
    applyPartyInfo(partyInfoByPage[index]);
    updateQuestLinks(index);
    renderNoticeSummary(noticeLinesByPage);
    track.querySelectorAll(".es-carousel-slide").forEach((slide, idx) => {
      slide.classList.toggle("is-active", idx === index);
    });
  };

  const partyNav = document.querySelector("nav.party");
  const leftArrow = partyNav
    ? partyNav.querySelector('img[src*="yajirushi_l_org"]')
    : null;
  const rightArrow = partyNav
    ? partyNav.querySelector('img[src*="yajirushi_r_org"]')
    : null;

  if (leftArrow) {
    leftArrow.style.cursor = "pointer";
    const leftLink = leftArrow.closest("a");
    const handler = (event) => {
      event.preventDefault();
      if (index > 0) {
        index -= 1;
        update();
      }
    };
    (leftLink || leftArrow).addEventListener("click", handler);
  }

  if (rightArrow) {
    rightArrow.style.cursor = "pointer";
    const rightLink = rightArrow.closest("a");
    const handler = (event) => {
      event.preventDefault();
      if (index < slideCount - 1) {
        index += 1;
        update();
      }
    };
    (rightLink || rightArrow).addEventListener("click", handler);
  }

  let startX = 0;
  let deltaX = 0;
  let dragging = false;

  const onTouchStart = (event) => {
    if (slideCount <= 1) return;
    dragging = true;
    deltaX = 0;
    startX = event.touches[0].clientX;
    track.style.transition = "none";
  };

  const onTouchMove = (event) => {
    if (!dragging) return;
    const currentX = event.touches[0].clientX;
    deltaX = currentX - startX;
    const step = getTrackStep();
    const baseOffset = getBaseOffset();
    track.style.transform = `translateX(${-(index * step) + baseOffset + deltaX}px)`;
  };

  const onTouchEnd = () => {
    if (!dragging) return;
    dragging = false;
    track.style.transition = "";
    const step = getTrackStep();
    if (Math.abs(deltaX) > step * SWIPE_THRESHOLD) {
      if (deltaX < 0 && index < slideCount - 1) index += 1;
      if (deltaX > 0 && index > 0) index -= 1;
    }
    update();
  };

  carousel.addEventListener("touchstart", onTouchStart, { passive: true });
  carousel.addEventListener("touchmove", onTouchMove, { passive: true });
  carousel.addEventListener("touchend", onTouchEnd);
  carousel.addEventListener("touchcancel", onTouchEnd);

  hideQuestRow();
  window.addEventListener("resize", update);
  update();
})();
