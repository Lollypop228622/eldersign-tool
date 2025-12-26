(() => {
  const PANEL_ID = "__es_skill_order_panel";
  const DEFAULT_LEFT = "左";
  const DEFAULT_RIGHT = "右";

  function normalizeName(name) {
    return name.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
  }

  function getLinesFromElement(el) {
    const lines = [];
    let current = "";

    const flush = () => {
      const text = current.trim();
      if (text) lines.push(text);
      current = "";
    };

    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        current += node.textContent || "";
        return;
      }
      if (node.nodeName === "BR") {
        flush();
        return;
      }
      current += node.textContent || "";
    });

    flush();
    return lines;
  }

  function parsePartyCell(td) {
    const monsters = [];
    const ps = td.querySelectorAll("p");
    ps.forEach((p) => {
      const lines = getLinesFromElement(p);
      if (!lines.length) return;
      const nameLine = lines[0];
      const name = parseNameLine(nameLine);
      const level = parseLevel(nameLine);
      const statusLine = lines.length >= 2 ? lines[1].replace(/\s+/g, " ").trim() : "";
      const status = parseInitialStatus(statusLine);
      monsters.push({ name, level, status });
    });
    return monsters;
  }

  function parseNameLine(line) {
    const nameMatch = line.match(/^(.*)\s+Lv\d+/);
    return normalizeName(nameMatch ? nameMatch[1] : line);
  }

  function parseLevel(line) {
    const m = line.match(/Lv\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseInitialStatus(line) {
    if (!line) return "";
    const m = line.match(/(\d+)\s*\/\s*(\d+)\s*(.*)$/);
    if (!m) return "";
    const maxHp = m[2];
    const state = normalizeName(m[3] || "");
    return `HP${maxHp}${state ? " " + state : ""}`;
  }

  function buildMonsterMap(list) {
    const order = [];
    const map = new Map();
    list.forEach((m) => {
      if (map.has(m.name)) return;
      order.push(m.name);
      map.set(m.name, {
        name: m.name,
        level: m.level ?? null,
        status: m.status,
        turns: {},
      });
    });
    return { order, map };
  }

  function ensureMonster(mapInfo, name) {
    if (mapInfo.map.has(name)) return mapInfo.map.get(name);
    mapInfo.order.push(name);
    const m = { name, level: null, status: "", turns: {} };
    mapInfo.map.set(name, m);
    return m;
  }

  function addSkill(mapInfo, name, turn, skill) {
    if (!skill) return;
    const m = ensureMonster(mapInfo, name);
    if (!m.turns[turn]) m.turns[turn] = [];
    m.turns[turn].push(skill);
  }

  function parseTurnNumber(section) {
    const h4 = section.querySelector("header h4");
    if (!h4) return null;
    const m = h4.textContent.match(/Turn\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function extractSkillFromEm(text) {
    const t = text.trim();
    const attackMatch = t.match(/^(.+?)の攻撃！(.*)$/);
    if (attackMatch) {
      const actor = normalizeName(attackMatch[1]);
      let skill = attackMatch[2].trim();
      if (skill.endsWith("！")) skill = skill.slice(0, -1).trim();
      if (!skill) return { actor, skill: null };
      return { actor, skill };
    }
    const generalMatch = t.match(/^(.+?)の.+?！(.*)$/);
    if (generalMatch) {
      const actor = normalizeName(generalMatch[1]);
      let skill = generalMatch[2].trim();
      if (skill.endsWith("！")) skill = skill.slice(0, -1).trim();
      if (!skill) return { actor, skill: null };
      return { actor, skill };
    }
    return null;
  }

  function extractSupportSkill(text) {
    const t = text.trim();
    const m = t.match(/！([^！]+)！/);
    if (m) return m[1].trim();
    const parts = t.split("！");
    if (parts.length >= 2) return parts[1].trim();
    return null;
  }

  function isSupportEffectLine(line) {
    if (!line) return false;
    if (!line.includes("は")) return false;
    if (/(効果が無かった|抵抗した|回避した|なんともない|倒れた|解けた)/.test(line)) return false;
    if (/ダメージ！/.test(line)) return false;
    return /！$/.test(line);
  }

  function renderPanel(leftTitle, rightTitle, leftText, rightText) {
    document.getElementById(PANEL_ID)?.remove();

    const box = document.createElement("div");
    box.id = PANEL_ID;
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;" +
      "background:rgba(0,0,0,.8);color:#fff;padding:24px 12px 12px;" +
      "border-radius:8px;font-family:monospace;font-size:13px;" +
      "max-width:calc(100% - 20px);max-height:calc(100% - 20px);" +
      "overflow:auto;display:inline-flex;" +
      "flex-direction:column;align-items:flex-end;";

    const closePanel = () => {
      window.removeEventListener("resize", onResize);
      box.remove();
    };

    const close = document.createElement("span");
    close.textContent = "×";
    close.setAttribute("role", "button");
    close.setAttribute("tabindex", "0");
    close.title = "閉じる";
    close.style.cssText =
      "position:absolute;top:0px;right:0px;cursor:pointer;" +
      "color:#fff;font-size:16px;line-height:16px;padding:6px 10px;";
    close.onclick = (e) => {
      e.stopPropagation();
      closePanel();
    };
    close.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
        closePanel();
      }
    };

    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;gap:12px;flex-wrap:nowrap;justify-content:flex-end;";

    const panels = [];

    const makePanel = (title, text, isLeft) => {
      const panel = document.createElement("div");
      panel.style.cssText =
        "min-width:280px;max-width:46vw;border:1px solid rgba(255,255,255,.2);" +
        "border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:6px;";

      const head = document.createElement("div");
      head.style.cssText = "display:flex;justify-content:space-between;gap:8px;";

      const label = document.createElement("div");
      label.textContent = title;
      label.style.cssText = "font-weight:bold;";

      const btn = document.createElement("span");
      btn.title = "コピー";
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");
      btn.style.cssText =
        "cursor:pointer;background:transparent;color:#fff;border:1px solid transparent;" +
        "border-radius:4px;padding:2px;line-height:0;display:flex;align-items:center;";
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"' +
        ' fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z"/>' +
        '<path d="M20 5H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h12v14z"/></svg>';

      const onCopy = async (e) => {
        e.stopPropagation();
        await copyText(wrapCopyText(title, text));
        btn.style.color = "#9fd";
        setTimeout(() => {
          btn.style.color = "#fff";
        }, 1200);
      };
      btn.onclick = onCopy;
      btn.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") onCopy(e);
      };

      head.appendChild(label);
      head.appendChild(btn);

      const pre = document.createElement("pre");
      pre.style.cssText = "margin:0;white-space:pre;overflow:auto;max-height:70vh;";
      pre.textContent = text;

      panel.appendChild(head);
      panel.appendChild(pre);
      row.appendChild(panel);
      panels.push(panel);

      if (isLeft) {
        copyText(wrapCopyText(title, text)).catch(() => {});
      }
    };

    makePanel(leftTitle, leftText, true);
    makePanel(rightTitle, rightText, false);

    const applyLayout = () => {
      row.style.flexDirection = "row";
      row.style.alignItems = "stretch";
      panels.forEach((panel) => {
        panel.style.minWidth = "280px";
        panel.style.maxWidth = "46vw";
        panel.style.width = "";
      });

      const available = Math.max(0, window.innerWidth - 20);
      const rowWidth = row.scrollWidth;
      const boxRect = box.getBoundingClientRect();
      if (rowWidth > available || boxRect.left < 10) {
        row.style.flexDirection = "column";
        row.style.alignItems = "flex-end";
        panels.forEach((panel) => {
          panel.style.minWidth = "0";
          panel.style.maxWidth = "calc(100vw - 20px - 24px)";
        });
        const widths = panels.map((panel) => panel.getBoundingClientRect().width);
        const maxWidth = Math.min(available - 24, Math.max(...widths, 0));
        panels.forEach((panel) => {
          panel.style.width = `${Math.ceil(maxWidth)}px`;
        });
      }
    };

    const onResize = () => applyLayout();

    box.appendChild(close);
    box.appendChild(row);
    document.body.appendChild(box);
    window.addEventListener("resize", onResize);
    requestAnimationFrame(applyLayout);
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function wrapCopyText(title, text) {
    return "```\n" + title + "\n" + text + "\n```";
  }

  function buildOutputText(mapInfo, maxTurn, presentByTurn) {
    const lines = [];
    mapInfo.order.forEach((name) => {
      const m = mapInfo.map.get(name);
      if (!m) return;
      const status = m.status || "-";
      const levelText = m.level != null ? `Lv${m.level}` : "";
      lines.push([m.name, levelText].filter(Boolean).join(" "));
      lines.push(status);

      const p0Skills = m.turns[0] || [];
      lines.push(` P0: ${p0Skills.length ? p0Skills.join(" / ") : "-"}`);

      const seen = new Set(p0Skills);
      const actions = [];
      for (let t = 1; t <= maxTurn; t++) {
        if (presentByTurn && !presentByTurn[t]?.has(name)) continue;
        const skills = m.turns[t] || [];
        skills.forEach((skill) => {
          if (!skill || seen.has(skill)) return;
          seen.add(skill);
          actions.push(skill);
        });
      }
      actions.forEach((skill, idx) => {
        lines.push(` A${idx + 1}: ${skill}`);
      });
      lines.push("");
    });
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines.join("\n");
  }

  function getPartyTitles() {
    const h1 = document.querySelector("section.btl header.btl h1");
    if (!h1) return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
    const parts = h1.textContent.split("vs");
    if (parts.length < 2) return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
    return {
      left: normalizeName(parts[0]),
      right: normalizeName(parts[1]),
    };
  }

  function collectPresence(td) {
    const names = new Set();
    const ps = td.querySelectorAll("p");
    ps.forEach((p) => {
      const lines = getLinesFromElement(p);
      if (!lines.length) return;
      const name = parseNameLine(lines[0]);
      if (name) names.add(name);
    });
    return names;
  }

  try {
    const turnSections = Array.from(document.querySelectorAll("section.turn"));
    if (!turnSections.length) {
      alert("バトル結果ページで使用してください");
      return;
    }

    const firstTurn = turnSections[0];
    const partyTable = firstTurn.querySelector("table.party");
    if (!partyTable) {
      alert("初期陣営情報が見つかりません");
      return;
    }

    const partyCells = partyTable.querySelectorAll("tbody tr td");
    if (partyCells.length < 2) {
      alert("陣営情報の取得に失敗しました");
      return;
    }

    const leftMonsters = parsePartyCell(partyCells[0]);
    const rightMonsters = parsePartyCell(partyCells[1]);

    const leftInfo = buildMonsterMap(leftMonsters);
    const rightInfo = buildMonsterMap(rightMonsters);

    const allTurns = [];
    turnSections.forEach((section) => {
      const t = parseTurnNumber(section);
      if (t != null) allTurns.push(t);
    });
    const maxTurn = allTurns.length ? Math.max(...allTurns) : 0;

    const presentLeftByTurn = [];
    const presentRightByTurn = [];
    presentLeftByTurn[0] = new Set(leftMonsters.map((m) => m.name));
    presentRightByTurn[0] = new Set(rightMonsters.map((m) => m.name));

    const preTurnRounds = Array.from(document.querySelectorAll("p.round")).filter(
      (p) => !p.closest("section.turn")
    );
    preTurnRounds.forEach((p) => {
      const em = p.querySelector("em");
      if (!em) return;
      const skill = extractSupportSkill(em.textContent);
      if (!skill) return;

      const lines = getLinesFromElement(p);
      const added = new Set();
      lines.forEach((line) => {
        if (!isSupportEffectLine(line)) return;
        const m = line.match(/^(.+?)は(.+?)！$/);
        if (!m) return;
        const target = normalizeName(m[1]);
        if (added.has(target)) return;
        if (leftInfo.map.has(target)) {
          addSkill(leftInfo, target, 0, skill);
          added.add(target);
        } else if (rightInfo.map.has(target)) {
          addSkill(rightInfo, target, 0, skill);
          added.add(target);
        }
      });
    });

    turnSections.forEach((section) => {
      const turn = parseTurnNumber(section);
      if (turn == null) return;

      const table = section.querySelector("table.party");
      if (table) {
        const cells = table.querySelectorAll("tbody tr td");
        if (cells.length >= 2) {
          presentLeftByTurn[turn] = collectPresence(cells[0]);
          presentRightByTurn[turn] = collectPresence(cells[1]);
        }
      }

      const rounds = section.querySelectorAll("p.round");
      rounds.forEach((p) => {
        const ems = p.querySelectorAll("em");
        let parsed = null;
        for (const em of ems) {
          parsed = extractSkillFromEm(em.textContent);
          if (parsed) break;
        }
        if (!parsed || !parsed.actor) return;
        if (!parsed.skill) return;

        if (leftInfo.map.has(parsed.actor)) {
          addSkill(leftInfo, parsed.actor, turn, parsed.skill);
        } else if (rightInfo.map.has(parsed.actor)) {
          addSkill(rightInfo, parsed.actor, turn, parsed.skill);
        }
      });
    });

    const leftText = buildOutputText(leftInfo, maxTurn, presentLeftByTurn);
    const rightText = buildOutputText(rightInfo, maxTurn, presentRightByTurn);
    const titles = getPartyTitles();
    renderPanel(titles.left, titles.right, leftText, rightText);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
