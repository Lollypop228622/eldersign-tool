(() => {
      const STORAGE_KEY = "eldersign_skill_inherit_bonus";
      const inputs = {
        familyMatch: document.getElementById("family-match"),
        rarity: document.getElementById("rarity"),
        normalSkillList: document.getElementById("normal-skill-list"),
        normalSkillAdd: document.getElementById("normal-skill-add"),
        latentSkillList: document.getElementById("latent-skill-list"),
        latentSkillAdd: document.getElementById("latent-skill-add"),
        currentLv: document.getElementById("current-lv"),
        maxLv: document.getElementById("max-lv"),
        bonusSilver: document.getElementById("bonus-silver"),
        bonusBoost: document.getElementById("bonus-boost"),
        bonusLamp: document.getElementById("bonus-lamp"),
      };

      const outputs = {
        normalList: document.getElementById("normal-result-list"),
        latentList: document.getElementById("latent-result-list"),
        appearanceTotal: document.getElementById("appearance-total"),
        appearanceMeta: document.getElementById("appearance-meta"),
      };

      function readNumber(input) {
        const value = Number(input.value);
        return Number.isFinite(value) ? value : 0;
      }

      function truncate1(value) {
        return Math.trunc(value * 10) / 10;
      }

      function buildSkillSelect(value) {
        const select = document.createElement("select");
        for (let i = 1; i <= 10; i += 1) {
          const opt = document.createElement("option");
          opt.value = String(i);
          opt.textContent = String(i);
          select.appendChild(opt);
        }
        if (value != null) select.value = String(value);
        return select;
      }

      function createSkillRow(initialValue, nameValue) {
        const row = document.createElement("div");
        row.className = "repeat-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "スキル名";
        if (nameValue) nameInput.value = nameValue;
        const select = buildSkillSelect(initialValue ?? 1);
        row.appendChild(nameInput);
        row.appendChild(select);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "icon-button";
        remove.setAttribute("aria-label", "削除");
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.textContent = "delete";
        remove.appendChild(icon);
        row.appendChild(remove);
        return { row, nameInput, select, remove };
      }

      function appendSkillRow(container, initialValue, nameValue) {
        const { row, nameInput, select, remove } = createSkillRow(initialValue, nameValue);
        container.appendChild(row);
        nameInput.addEventListener("input", updateResult);
        select.addEventListener("change", updateResult);
        remove.addEventListener("click", () => {
          row.remove();
          ensureMinRow(container);
          updateResult();
        });
        return row;
      }

      function ensureMinRow() {
        return;
      }

      function getSkillEntries(container) {
        const entries = [];
        container.querySelectorAll(".repeat-row").forEach((row) => {
          const nameInput = row.querySelector("input");
          const select = row.querySelector("select");
          if (!select) return;
          const lv = parseInt(select.value, 10);
          if (!Number.isFinite(lv)) return;
          const name = nameInput ? nameInput.value.trim() : "";
          entries.push({ level: lv, name });
        });
        return entries;
      }

      function calcAlpha(rarity) {
        switch (rarity) {
          case "bronze":
            return 5;
          case "silver":
            return 2;
          default:
            return 0;
        }
      }

      function calcBonus() {
        let bonus = 0;
        if (inputs.bonusSilver.checked) bonus += 5;
        if (inputs.bonusBoost.checked) bonus += 20;
        if (inputs.bonusLamp.checked) bonus += 45;
        return bonus;
      }

      function loadBonusSettings() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (typeof parsed !== "object" || parsed == null) return;
          if (typeof parsed.silver === "boolean") {
            inputs.bonusSilver.checked = parsed.silver;
          }
          if (typeof parsed.boost === "boolean") {
            inputs.bonusBoost.checked = parsed.boost;
          }
          if (typeof parsed.lamp === "boolean") {
            inputs.bonusLamp.checked = parsed.lamp;
          }
        } catch (e) {
          return;
        }
      }

      function parseBooleanParam(value) {
        if (value == null) return null;
        if (value === "1" || value === "true") return true;
        if (value === "0" || value === "false") return false;
        return null;
      }

      function parseNameList(value) {
        if (!value) return [];
        return value
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0);
      }

      function setChipValue(input, value) {
        if (!input || value == null) return;
        const strValue = String(value);
        input.value = strValue;
        const group = document.querySelector(`.chip-group[data-chip-target="${input.id}"]`);
        if (!group) return;
        group.querySelectorAll(".chip-button").forEach((button) => {
          const isActive = button.dataset.value === strValue;
          button.classList.toggle("is-active", isActive);
        });
      }

      function setSelectValue(select, value) {
        if (!select || value == null) return;
        const strValue = String(value);
        const hasOption = [...select.options].some((opt) => opt.value === strValue);
        if (hasOption) select.value = strValue;
      }

      function setSkillList(container, entries) {
        container.innerHTML = "";
        const list = entries.length > 0 ? entries : [{ level: 1, name: "" }];
        list.forEach((entry, index) => {
          appendSkillRow(container, entry.level, entry.name);
        });
      }

      function applyParams(params) {
        if (!params) return;

        const family = params.get("family");
        if (family === "same" || family === "diff") {
          setChipValue(inputs.familyMatch, family);
        }

        const rarityParam = params.get("rarity");
        if (rarityParam) setChipValue(inputs.rarity, rarityParam);

        const allNames = parseNameList(params.get("skill_name") ?? "");
        const normalNames = parseNameList(params.get("normal_name") ?? "");
        const latentNames = parseNameList(params.get("latent_name") ?? "");
        const normalNameList = normalNames.length > 0 ? normalNames : allNames;
        const latentNameList = latentNames.length > 0 ? latentNames : allNames;

        const normalParam = params.get("normal_lv") ?? "";
        const normalValues = normalParam
          .split(",")
          .map((value) => parseInt(value, 10))
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.max(1, Math.min(10, value)));
        const normalCount = Math.max(normalValues.length, normalNameList.length, 1);
        const normalEntries = Array.from({ length: normalCount }, (_, i) => ({
          level: normalValues[i] ?? 1,
          name: normalNameList[i] ?? "",
        }));
        setSkillList(inputs.normalSkillList, normalEntries);

        const latentParam = params.get("latent_lv") ?? "";
        const latentValues = latentParam
          .split(",")
          .map((value) => parseInt(value, 10))
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.max(1, Math.min(10, value)));
        const latentCount = Math.max(latentValues.length, latentNameList.length, 1);
        const latentEntries = Array.from({ length: latentCount }, (_, i) => ({
          level: latentValues[i] ?? 1,
          name: latentNameList[i] ?? "",
        }));
        setSkillList(inputs.latentSkillList, latentEntries);

        const currentLv = parseInt(params.get("current_lv"), 10);
        if (Number.isFinite(currentLv)) inputs.currentLv.value = String(currentLv);

        const maxLv = parseInt(params.get("max_lv"), 10);
        if (Number.isFinite(maxLv)) setChipValue(inputs.maxLv, maxLv);

        const silver = parseBooleanParam(params.get("bonus_silver"));
        if (silver != null) inputs.bonusSilver.checked = silver;

        const boost = parseBooleanParam(params.get("bonus_boost"));
        if (boost != null) inputs.bonusBoost.checked = boost;

        const lamp = parseBooleanParam(params.get("bonus_lamp"));
        if (lamp != null) inputs.bonusLamp.checked = lamp;
      }

      function saveBonusSettings() {
        const payload = {
          silver: inputs.bonusSilver.checked,
          boost: inputs.bonusBoost.checked,
          lamp: inputs.bonusLamp.checked,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          return;
        }
      }

      function calcInheritBase(isSameFamily, isLatent, skillLv, alpha) {
        if (skillLv <= 0) return null;
        if (isSameFamily) {
          return (isLatent ? 6 : 9.5) * skillLv + alpha;
        }
        return (isLatent ? 5 : 9) * skillLv + alpha;
      }

      function formatRate(value) {
        if (value == null) return "-";
        return `${value.toFixed(1)}%`;
      }

      function renderSkillResults(listEl, entries, baseCoeff, alpha, bonus, isSameFamily, isLatent) {
        listEl.innerHTML = "";
        if (entries.length === 0) {
          const li = document.createElement("li");
          li.className = "result-item";
          li.textContent = "スキルLvを追加してください。";
          listEl.appendChild(li);
          return;
        }

        entries.forEach((entry) => {
          const lv = entry.level;
          const base = calcInheritBase(isSameFamily, isLatent, lv, alpha);
          const total =
            base == null ? null : Math.min(100, Math.max(0, truncate1(base + bonus)));
          const li = document.createElement("li");
          li.className = "result-item";
          const title = document.createElement("div");
          title.className = "result-item-title";
          const name = entry.name;
          const label = name ? `${name} Lv${lv}` : `Lv${lv}`;
          title.textContent = `${label}: ${formatRate(total)}`;
          const meta = document.createElement("div");
          meta.className = "result-item-meta";
          const lvValue = truncate1(lv * baseCoeff).toFixed(1);
          meta.textContent = `スキルLv ${lvValue}% + レアリティ ${alpha}% + 補正 ${truncate1(bonus).toFixed(1)}%`;
          li.appendChild(title);
          li.appendChild(meta);
          listEl.appendChild(li);
        });
      }

      function updateResult() {
        const isSameFamily = inputs.familyMatch.value === "same";
        const alpha = calcAlpha(inputs.rarity.value);
        const bonus = calcBonus();
        const rarityLabelMap = {
          bronze: "銅",
          silver: "銀",
          gold: "金",
        };
        const selectedLabel = rarityLabelMap[inputs.rarity.value];
        const maxLvLabelMap = {
          30: "銅",
          50: "銀",
          70: "金",
          90: "プラチナ",
        };
        const maxLvLabel = maxLvLabelMap[Number(readNumber(inputs.maxLv))] || "";
        document.querySelectorAll("table.note-table tbody tr").forEach((row) => {
          const table = row.closest("table.note-table");
          const tableType = table ? table.dataset.table : "";
          const labelCell = row.querySelector("td");
          const label = labelCell ? labelCell.textContent.trim() : "";
          const targetLabel = tableType === "appearance" ? maxLvLabel : selectedLabel;
          const isMatch =
            label === targetLabel ||
            (targetLabel && (label.startsWith(`${targetLabel}(`) || label.startsWith(targetLabel)));
          row.classList.toggle("is-active", isMatch);
        });
        const normalEntries = getSkillEntries(inputs.normalSkillList);
        const latentEntries = getSkillEntries(inputs.latentSkillList);

        renderSkillResults(outputs.normalList, normalEntries, 9.5, alpha, bonus, isSameFamily, false);
        renderSkillResults(outputs.latentList, latentEntries, 6, alpha, bonus, isSameFamily, true);

        const currentLv = readNumber(inputs.currentLv);
        const maxLv = readNumber(inputs.maxLv);
        let appearanceBase = null;
        let appearanceLevel = null;
        if (maxLv > 0) {
          appearanceLevel = (currentLv / maxLv) * 100;
          appearanceBase = appearanceLevel + alpha;
        }

        const appearanceTotal =
          appearanceBase == null
            ? null
            : Math.min(100, Math.max(0, truncate1(appearanceBase + bonus)));

        outputs.appearanceTotal.textContent = formatRate(appearanceTotal);
        outputs.appearanceMeta.textContent =
          appearanceBase == null
            ? "現Lv/最高Lvを入力してください。"
            : `レベル ${truncate1(appearanceLevel).toFixed(1)}% + レアリティ ${alpha}% + 補正 ${truncate1(bonus).toFixed(1)}%`;
      }

      [inputs.currentLv].forEach((input) => {
        input.addEventListener("input", updateResult);
        input.addEventListener("change", updateResult);
      });

      document.querySelectorAll(".chip-group").forEach((group) => {
        group.addEventListener("click", (event) => {
          const button = event.target.closest(".chip-button");
          if (!button || !group.contains(button)) return;
          const targetId = group.dataset.chipTarget;
          if (!targetId) return;
          const input = document.getElementById(targetId);
          if (!input) return;
          setChipValue(input, button.dataset.value);
          updateResult();
        });
      });

      [inputs.bonusSilver, inputs.bonusBoost, inputs.bonusLamp].forEach((input) => {
        const handler = () => {
          saveBonusSettings();
          updateResult();
        };
        input.addEventListener("input", handler);
        input.addEventListener("click", handler);
        input.addEventListener("change", handler);
      });

      inputs.normalSkillAdd.addEventListener("click", () => {
        appendSkillRow(inputs.normalSkillList, 1, "");
        updateResult();
      });

      inputs.latentSkillAdd.addEventListener("click", () => {
        appendSkillRow(inputs.latentSkillList, 1, "");
        updateResult();
      });

      setSkillList(inputs.normalSkillList, [{ level: 1, name: "" }]);
      setSkillList(inputs.latentSkillList, [{ level: 1, name: "" }]);
      loadBonusSettings();
      setChipValue(inputs.familyMatch, inputs.familyMatch.value);
      setChipValue(inputs.rarity, inputs.rarity.value);
      setChipValue(inputs.maxLv, inputs.maxLv.value);
      applyParams(new URLSearchParams(window.location.search));
      updateResult();
    })();
