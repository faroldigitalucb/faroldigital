(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});

  /* =====================================================================
     Camada de dados conectada ao Firebase Firestore
     ===================================================================== */
  const firebaseConfig = {
    apiKey: "AIzaSyDa4PpxnhV_FOVPD0NH19RNhOeTLhHh3rk",
    authDomain: "nivel-quiz-e4b31.firebaseapp.com",
    projectId: "nivel-quiz-e4b31",
    storageBucket: "nivel-quiz-e4b31.firebasestorage.app",
    messagingSenderId: "865709507708",
    appId: "1:865709507708:web:7cf87e3e6f024cc2aef5f9"
  };

  // Inicializa o Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const firestoreDb = firebase.firestore();

  const Store = (() => {
    const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

    return {
      get mode() {
        return 'cloud';
      },
      async init() {
        return 'cloud';
      },
      async get(path) {
        const doc = await firestoreDb.doc(path).get();
        return doc.exists ? clone(doc.data()) : null;
      },
      async set(path, data) {
        await firestoreDb.doc(path).set(clone(data));
      },
      async update(path, data) {
        await firestoreDb.doc(path).update(clone(data));
      },
      async del(path) {
        await firestoreDb.doc(path).delete();
      },
      async list(collectionName) {
        const snap = await firestoreDb.collection(collectionName).get();
        return snap.docs.map(doc => ({ id: doc.id, data: clone(doc.data()) }));
      },
      watchDoc(path, callback) {
        return firestoreDb.doc(path).onSnapshot(
          doc => callback(doc.exists ? clone(doc.data()) : null),
          err => console.warn('watchDoc erro:', path, err)
        );
      },
      watchCol(collectionName, callback) {
        return firestoreDb.collection(collectionName).onSnapshot(
          snap => callback(snap.docs.map(doc => ({ id: doc.id, data: clone(doc.data()) }))),
          err => console.warn('watchCol erro:', collectionName, err)
        );
      }
    };
  })();

  Object.assign(Nivel, {
    firebaseConfig,
    firestoreDb,
    Store
  });
})();
