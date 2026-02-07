(() => {
  const common = window.EldersignToolCommon || {};
  const readNumber = common.readNumber || ((input, fallback = 0) => {
    const value = Number(input && input.value);
    return Number.isFinite(value) ? value : fallback;
  });
  const setChipValue = common.setChipValue || ((input, value) => {
    if (!input || value == null) return;
    const stringValue = String(value);
    input.value = stringValue;
    const group = document.querySelector(`.chip-group[data-chip-target="${input.id}"]`);
    if (!group) return;
    group.querySelectorAll(".chip-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === stringValue);
    });
  });
  const bindChipGroups = common.bindChipGroups || ((onChange) => {
    document.querySelectorAll(".chip-group").forEach((group) => {
      group.addEventListener("click", (event) => {
        const button = event.target.closest(".chip-button");
        if (!button || !group.contains(button)) return;
        const targetId = group.dataset.chipTarget;
        if (!targetId) return;
        const input = document.getElementById(targetId);
        if (!input) return;
        setChipValue(input, button.dataset.value);
        if (typeof onChange === "function") onChange(input, button.dataset.value, group);
      });
    });
  });

  const RANDOM_MIN = 0.875;
  const RANDOM_MAX = 1.125;
  const STORAGE_KEY = "eldersign_damage_form_v1";

  const ATTACK_CONST_BY_ATTR = {
    physical: 5,
    element: 9,
    void: 20,
  };

  const DEFENSE_CONST_BY_ATTR = {
    physical: 500,
    element: 120,
    void: 10,
  };

  const inputs = {
    skillType: document.getElementById("skill-type"),
    skillCoeff: document.getElementById("skill-coeff"),
    skillSource: document.getElementById("skill-source"),
    skillAttr: document.getElementById("skill-attr"),
    skillResistPassive: document.getElementById("skill-resist-passive"),
    skillResistActive: document.getElementById("skill-resist-active"),
    skillAptPassive: document.getElementById("skill-apt-passive"),
    skillAptActive: document.getElementById("skill-apt-active"),
    skillBuff: document.getElementById("skill-buff"),
    skillSeal: document.getElementById("skill-seal"),
    defValue: document.getElementById("def-value"),
    defAlert: document.getElementById("def-alert"),
    defHardening: document.getElementById("def-hardening"),
    defCritical: document.getElementById("def-critical"),
    unionReduce: document.getElementById("union-reduce"),
    hitSkill: document.getElementById("hit-skill"),
    hitAttacker: document.getElementById("hit-attacker"),
    hitDefender: document.getElementById("hit-defender"),
    hitDizzyAttacker: document.getElementById("hit-dizzy-attacker"),
    hitDizzyDefender: document.getElementById("hit-dizzy-defender"),
    hitAfter: document.getElementById("hit-after"),
    hitMonarch: document.getElementById("hit-monarch"),
    hitEye: document.getElementById("hit-eye"),
  };

  const outputs = {
    atkDamageBase: document.getElementById("atk-damage-base"),
    atkDamageRange: document.getElementById("atk-damage-range"),
    hitRaw: document.getElementById("hit-raw"),
    detailSkillPower: document.getElementById("detail-skill-power"),
    detailDefPower: document.getElementById("detail-def-power"),
    detailDamageMeta: document.getElementById("detail-damage-meta"),
    detailUnionMeta: document.getElementById("detail-union-meta"),
    detailHealMeta: document.getElementById("detail-heal-meta"),
    detailHitMeta: document.getElementById("detail-hit-meta"),
    resultSummary: document.getElementById("result-summary"),
    resultDetailPanel: document.getElementById("result-detail-panel"),
  };

  // 数値表示用の共通フォーマッタ。非数は "-" で返す。
  function formatNumber(value, digits = 1) {
    if (!Number.isFinite(value)) return "-";
    return value.toFixed(digits);
  }

  // ダメージ表示用フォーマッタ。小数は切り上げて整数表示する。
  function formatDamage(value) {
    if (!Number.isFinite(value)) return "-";
    return String(Math.ceil(value));
  }

  // 入力されたソース値群を分解して平均値を返す。
  function parseSourceAverage(text) {
    if (!text) return 0;
    const values = text
      .split(/[,\s]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return 0;
    const sum = values.reduce((accumulator, value) => accumulator + value, 0);
    return sum / values.length;
  }

  // 属性から攻撃定数を引く。
  function getAttackConst(attr) {
    return ATTACK_CONST_BY_ATTR[attr] ?? 0;
  }

  // 属性から防御定数を引く。
  function getDefenseConst(attr) {
    return DEFENSE_CONST_BY_ATTR[attr] ?? 0;
  }

  // 適正値の上限・下限ルールを適用する。
  function normalizeProper(value) {
    if (value <= -100) return -100;
    if (value > 100) return Math.sqrt(100 * value);
    return value;
  }

  // 耐性値の下限ルールを適用する。
  function normalizeTolerant(value) {
    if (value < -100) return -Math.sqrt(-100 * value);
    return value;
  }

  // 耐性・適正の補正率と表示用の中間値をまとめて計算する。
  function calcResAptMultiplier() {
    const tolerantP = normalizeTolerant(readNumber(inputs.skillResistPassive));
    const tolerantA = normalizeTolerant(readNumber(inputs.skillResistActive));
    const properP = normalizeProper(readNumber(inputs.skillAptPassive));
    const properA = normalizeProper(readNumber(inputs.skillAptActive));

    const resPctP = 100 - tolerantP;
    const resPctA = 100 - tolerantA;
    const aptPctP = 100 + properP;
    const aptPctA = 100 + properA;

    return {
      res: (resPctP / 100) * (resPctA / 100),
      apt: (aptPctP / 100) * (aptPctA / 100),
      resPctP,
      resPctA,
      aptPctP,
      aptPctA,
    };
  }

  // 強化率を乗算係数へ変換する。
  function calcBuffMultiplier() {
    return 1 + readNumber(inputs.skillBuff) / 100;
  }

  // 封技/封術Lvを乗算係数へ変換する。
  function calcSealMultiplier() {
    return 1 - readNumber(inputs.skillSeal) / 10;
  }

  // 補正内訳の表示文字列を組み立てる。
  function formatResAptMeta(ra, sealMultiplier, buffMultiplier) {
    return `耐性${formatNumber(ra.resPctP, 1)}%×${formatNumber(ra.resPctA, 1)}% 適正${formatNumber(
      ra.aptPctP,
      1
    )}%×${formatNumber(ra.aptPctA, 1)}% 封${formatNumber(sealMultiplier * 100, 1)}% 強化${formatNumber(
      buffMultiplier * 100,
      1
    )}%`;
  }

  // 攻撃時のスキル強度を算出する。
  function calcSkillPower() {
    const coeff = readNumber(inputs.skillCoeff);
    const averageSource = parseSourceAverage(inputs.skillSource.value);
    const attackConst = getAttackConst(inputs.skillAttr.value);
    if (attackConst <= 0 || averageSource <= 0) return 0;
    return coeff * Math.sqrt(averageSource / attackConst);
  }

  // 属性・硬化・クリティカル状態から防御定数を決定する。
  function calcDefenseConstant() {
    const attr = inputs.skillAttr.value;
    const isPhysical = attr === "physical";
    const hardening = inputs.defHardening.checked;
    const critical = inputs.defCritical.checked;

    if (critical) {
      if (hardening && isPhysical) return 500;
      return 0;
    }
    if (hardening) {
      if (isPhysical) return 2000;
      return 0;
    }
    return getDefenseConst(attr);
  }

  // 防御力と隙を加味した防御強度を算出する。
  function calcDefensePower() {
    const defenseConst = calcDefenseConstant();
    const defense = readNumber(inputs.defValue);
    if (defenseConst <= 0 || defense <= 0) return 0;
    const alert = readNumber(inputs.defAlert);
    return Math.sqrt(defenseConst * defense) * (1 - alert / 100);
  }

  // 攻撃モードの結果表示を更新する。
  function updateAttack() {
    const skillPower = calcSkillPower();
    const defensePower = calcDefensePower();
    const ra = calcResAptMultiplier();
    const buffMultiplier = calcBuffMultiplier();
    const sealMultiplier = calcSealMultiplier();

    const base =
      skillPower * ra.res * ra.apt * buffMultiplier * sealMultiplier - defensePower;
    const unionReduce = Math.min(10, Math.max(0, readNumber(inputs.unionReduce)));
    const unionMultiplier = 1 - unionReduce / 100;
    const damage = base * unionMultiplier;

    outputs.atkDamageBase.textContent = formatDamage(damage);
    outputs.atkDamageRange.textContent = `${formatDamage(damage * RANDOM_MIN)} ～ ${formatDamage(
      damage * RANDOM_MAX
    )}`;
    outputs.detailSkillPower.textContent = formatNumber(skillPower, 1);
    outputs.detailDefPower.textContent = formatNumber(defensePower, 1);
    outputs.detailDamageMeta.textContent = formatResAptMeta(ra, sealMultiplier, buffMultiplier);
    outputs.detailUnionMeta.textContent = `${formatNumber(unionMultiplier * 100, 1)}%`;
    outputs.detailHealMeta.textContent = "-";
  }

  // 回復/付与モードの結果表示を更新する。
  function updateHeal() {
    const coeff = readNumber(inputs.skillCoeff);
    const averageSource = parseSourceAverage(inputs.skillSource.value);
    const ra = calcResAptMultiplier();
    const buffMultiplier = calcBuffMultiplier();
    const sealMultiplier = calcSealMultiplier();

    const value =
      coeff *
      Math.sqrt(averageSource * 0.2) *
      ra.res *
      ra.apt *
      buffMultiplier *
      sealMultiplier;

    outputs.atkDamageBase.textContent = formatDamage(value);
    outputs.atkDamageRange.textContent = "-";
    outputs.detailSkillPower.textContent = "-";
    outputs.detailDefPower.textContent = "-";
    outputs.detailDamageMeta.textContent = "-";
    outputs.detailUnionMeta.textContent = "-";
    outputs.detailHealMeta.textContent = formatResAptMeta(ra, sealMultiplier, buffMultiplier);
  }

  // 命中率の計算と表示を更新する。
  function updateHit() {
    const skillHit = readNumber(inputs.hitSkill);
    const attackerHit = readNumber(inputs.hitAttacker);
    const defenderAgi = readNumber(inputs.hitDefender);
    const alert = readNumber(inputs.defAlert);
    const dizzyAttacker = readNumber(inputs.hitDizzyAttacker);
    const dizzyDefender = readNumber(inputs.hitDizzyDefender);
    const after = inputs.hitAfter.checked ? 2 : 1;
    const monarch = inputs.hitMonarch.checked ? 1.5 : 1;

    const raw =
      70 +
      Math.sqrt(5) *
        (skillHit * (1 - dizzyAttacker / 10) * (Math.sqrt(attackerHit) / 100) -
          (1 - alert / 100) * (1 - dizzyDefender / 10) * Math.sqrt(defenderAgi));
    const corrected = raw * after * monarch;
    const caps = inputs.hitEye.checked ? { max: 99, min: 30 } : { max: 95, min: 20 };
    const final = Math.floor(Math.min(caps.max, Math.max(caps.min, corrected)));

    outputs.hitRaw.textContent = `${formatNumber(final, 0)}%(${formatNumber(corrected, 2)}%)`;
    outputs.detailHitMeta.textContent = `補正前命中率=${formatNumber(raw, 2)} 補正後=${formatNumber(
      corrected,
      2
    )}`;
  }

  // モードに応じて攻撃/回復専用UIの表示を切り替える。
  function updateModeUI() {
    const isAttackMode = inputs.skillType.value === "attack";
    document.querySelectorAll(".mode-attack").forEach((element) => {
      element.classList.toggle("is-hidden", !isAttackMode);
    });
    document.querySelectorAll(".mode-heal").forEach((element) => {
      element.classList.toggle("is-hidden", isAttackMode);
    });
  }

  // 詳細パネルの開閉状態とARIA属性を同期する。
  function setResultDetailOpen(open) {
    outputs.resultDetailPanel.classList.toggle("is-hidden", !open);
    outputs.resultSummary.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // 詳細パネル開閉をトグルする。
  function toggleResultDetailOpen() {
    const isOpen = !outputs.resultDetailPanel.classList.contains("is-hidden");
    setResultDetailOpen(!isOpen);
  }

  // フォーム状態をlocalStorageへ保存する。
  function saveFormState() {
    const state = {};
    Object.entries(inputs).forEach(([key, input]) => {
      if (!input) return;
      state[key] = input.type === "checkbox" ? input.checked : input.value;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }

  // 保存済みフォーム状態を復元する。
  function loadFormState() {
    let state = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : null;
    } catch (error) {
      state = null;
    }
    if (!state || typeof state !== "object") return;

    Object.entries(inputs).forEach(([key, input]) => {
      if (!input || !(key in state)) return;
      if (input.type === "checkbox") {
        input.checked = Boolean(state[key]);
        return;
      }
      input.value = String(state[key]);
    });

    setChipValue(inputs.skillType, inputs.skillType.value);
    setChipValue(inputs.skillAttr, inputs.skillAttr.value);
  }

  // 画面全体の再計算・再描画を行う。
  function updateAll() {
    updateModeUI();
    if (inputs.skillType.value === "attack") {
      updateAttack();
    } else {
      updateHeal();
    }
    updateHit();
    saveFormState();
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, updateAll);
  });

  bindChipGroups(() => {
    updateAll();
  });

  outputs.resultSummary.addEventListener("click", toggleResultDetailOpen);
  outputs.resultSummary.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleResultDetailOpen();
  });

  loadFormState();
  setResultDetailOpen(false);
  updateAll();
})();
