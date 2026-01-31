import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const firebaseEnv = isLocalhost ? "local" : "prod";

let firestorePromise = null;

const loadConfig = async () => {
  if (isLocalhost) {
    try {
      const module = await import("./firebase.config.local.js");
      return module.firebaseConfig;
    } catch (error) {
      throw new Error(
        "localhost用Firebase設定が見つかりません。docs/firebase.config.local.js を用意してください。"
      );
    }
  }
  const module = await import("./firebase.config.prod.js");
  return module.firebaseConfig;
};

const ensureFirestore = async () => {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const firebaseConfig = await loadConfig();
      const app = initializeApp(firebaseConfig);
      return getFirestore(app);
    })();
  }
  return firestorePromise;
};

const loadFirestoreDoc = async (pathSegments) => {
  const db = await ensureFirestore();
  const ref = doc(db, ...pathSegments);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

const saveFirestoreDoc = async (pathSegments, data, options) => {
  const db = await ensureFirestore();
  const ref = doc(db, ...pathSegments);
  await setDoc(ref, data, options);
  return ref;
};

export { firebaseEnv, isLocalhost, loadFirestoreDoc, saveFirestoreDoc, serverTimestamp };
