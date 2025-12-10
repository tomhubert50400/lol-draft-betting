const MOCK_USERS_KEY = "mock_users";
const CURRENT_USER_KEY = "mock_current_user";

function getMockUsers() {
  return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "[]");
}

function setMockUsers(users) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

export const auth = {
  get currentUser() {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    return user;
  }
};

export function createUserWithEmailAndPassword(auth, email, password) {
  return new Promise((resolve, reject) => {
    const users = getMockUsers();
    if (users.find(u => u.email === email)) {
      reject(new Error("Email already in use"));
      return;
    }
    const newUser = {
      uid: "user_" + Date.now(),
      email,
      password
    };
    users.push(newUser);
    setMockUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    resolve({ user: newUser });
  });
}

export function signInWithEmailAndPassword(auth, email, password) {
  return new Promise((resolve, reject) => {
    const users = getMockUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      reject(new Error("Invalid email or password"));
      return;
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    resolve({ user });
  });
}

export function updateProfile(user, profileUpdates) {
  return new Promise((resolve, reject) => {
    const users = getMockUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index === -1) {
      reject(new Error("User not found"));
      return;
    }
    
    const updatedUser = { ...users[index], ...profileUpdates };
    users[index] = updatedUser;
    setMockUsers(users);
    
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    if (currentUser && currentUser.uid === user.uid) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    
    resolve();
  });
}

export function signOut(auth) {
  return new Promise((resolve) => {
    localStorage.removeItem(CURRENT_USER_KEY);
    resolve();
  });
}

export function onAuthStateChanged(auth, callback) {
  const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  callback(user);
  
  const interval = setInterval(() => {
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  }, 1000);

  return () => clearInterval(interval);
}

export const db = {};

export function collection(db, path) {
  return { type: "collection", path };
}

export function doc(db, collectionPath, id) {
  let path = "";
  if (typeof collectionPath === "object" && collectionPath.type === "collection") {
    path = collectionPath.path;
  } else {
    path = collectionPath;
  }
  return { type: "doc", path, id };
}

function getCollectionData(path) {
  return JSON.parse(localStorage.getItem("mock_db_" + path) || "[]");
}

function setCollectionData(path, data) {
  localStorage.setItem("mock_db_" + path, JSON.stringify(data));
}

export function addDoc(collectionRef, data) {
  return new Promise((resolve) => {
    const list = getCollectionData(collectionRef.path);
    const id = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const newDoc = { id, ...data };
    list.push(newDoc);
    setCollectionData(collectionRef.path, list);
    resolve({ id });
  });
}

export function getDocs(queryRef) {
  return new Promise((resolve) => {
    let list = getCollectionData(queryRef.path);
    
    if (queryRef.filters) {
      queryRef.filters.forEach(filter => {
        if (filter.type === "where") {
          list = list.filter(item => {
            if (filter.op === "==") return item[filter.field] === filter.value;
            return true; 
          });
        }
      });
    }
    
    if (queryRef.sorts) {
      queryRef.sorts.forEach(sort => {
        list.sort((a, b) => {
          if (sort.dir === "desc") return b[sort.field] > a[sort.field] ? 1 : -1;
          return a[sort.field] > b[sort.field] ? 1 : -1;
        });
      });
    }

    const docs = list.map(item => ({
      id: item.id,
      data: () => item
    }));
    resolve({ docs, forEach: (cb) => docs.forEach(cb) });
  });
}

export function updateDoc(docRef, data) {
  return new Promise((resolve, reject) => {
    const list = getCollectionData(docRef.path);
    const index = list.findIndex(item => item.id === docRef.id);
    if (index === -1) {
      reject(new Error("Document not found"));
      return;
    }
    list[index] = { ...list[index], ...data };
    setCollectionData(docRef.path, list);
    resolve();
  });
}

export function deleteDoc(docRef) {
  return new Promise((resolve, reject) => {
    const list = getCollectionData(docRef.path);
    const index = list.findIndex(item => item.id === docRef.id);
    if (index === -1) {
      reject(new Error("Document not found"));
      return;
    }
    list.splice(index, 1);
    setCollectionData(docRef.path, list);
    resolve();
  });
}

export function query(collectionRef, ...constraints) {
  const q = { 
    path: collectionRef.path,
    filters: [],
    sorts: []
  };
  constraints.forEach(c => {
    if (c.type === "where") q.filters.push(c);
    if (c.type === "orderBy") q.sorts.push(c);
  });
  return q;
}

export function where(field, op, value) {
  return { type: "where", field, op, value };
}

export function orderBy(field, dir = "asc") {
  return { type: "orderBy", field, dir };
}

export function writeBatch(db) {
  const operations = [];
  return {
    update: (docRef, data) => {
      operations.push({ type: "update", docRef, data });
    },
    commit: async () => {
      for (const op of operations) {
        if (op.type === "update") {
          await updateDoc(op.docRef, op.data);
        }
      }
    }
  };
}
