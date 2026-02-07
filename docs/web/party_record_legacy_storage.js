(() => {
  const LOCAL_CACHE_KEY_BASE = "eldersign_party_record_cache_v2";
  const LEGACY_KEY = "eldersign_party_record_v1";

  const getCacheKey = (uid) => `${LOCAL_CACHE_KEY_BASE}_${uid || "anonymous"}`;

  const readLegacyStore = (uid, { normalizeStore, buildParty, defaultPartyCount }) => {
    try {
      const raw = localStorage.getItem(getCacheKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return normalizeStore(parsed);
        }
      }

      const baseRaw = localStorage.getItem(LOCAL_CACHE_KEY_BASE);
      if (baseRaw) {
        const baseParsed = JSON.parse(baseRaw);
        if (baseParsed && typeof baseParsed === "object") {
          if (uid) {
            try {
              localStorage.setItem(getCacheKey(uid), baseRaw);
            } catch (error) {
              // ignore cache migration errors
            }
          }
          return normalizeStore(baseParsed);
        }
      }

      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          return normalizeStore({
            activeParty: 1,
            parties: { 1: buildParty(legacyParsed) },
            partyCount: defaultPartyCount,
            partyNames: {},
          });
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  };

  const writeLegacyCache = (uid, store) => {
    try {
      localStorage.setItem(getCacheKey(uid), JSON.stringify(store));
    } catch (error) {
      // ignore cache errors
    }
  };

  window.EldersignLegacyStorage = {
    readLegacyStore,
    writeLegacyCache,
  };
})();
