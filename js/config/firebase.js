(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});

  /* =====================================================================
     Camada de dados conectada ao Firebase Firestore
     ===================================================================== */
  const firebaseConfig = {
    apiKey: "AIzaSyCB6ZL_NqJOMs8ThmEq1n4b0vImjP_x_mw",
    authDomain: "nivel-quiz-ucb.firebaseapp.com",
    projectId: "nivel-quiz-ucb",
    storageBucket: "nivel-quiz-ucb.firebasestorage.app",
    messagingSenderId: "620334200884",
    appId: "1:620334200884:web:c965d0c69bc7cb3894b261"
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
