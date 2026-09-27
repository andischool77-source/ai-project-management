const DB_NAME = "AIProjectManagementDB";
const DB_VERSION = 1;

const STORES = {
  projects: "projects",
  tasks: "tasks",
  team: "team",
  expenses: "expenses"
};

let dbInstance = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const store = db.createObjectStore(STORES.projects, {
          keyPath: "id",
          autoIncrement: true
        });
        
        store.createIndex("name", "name", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("deadline", "deadline", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.tasks)) {
        const store = db.createObjectStore(STORES.tasks, {
          keyPath: "id",
          autoIncrement: true
        });
        
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("deadline", "deadline", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.team)) {
        const store = db.createObjectStore(STORES.team, {
          keyPath: "id",
          autoIncrement: true
        });
        
        store.createIndex("name", "name", { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.expenses)) {
        const store = db.createObjectStore(STORES.expenses, {
          keyPath: "id",
          autoIncrement: true
        });
        
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
    };
    
    request.onsuccess = function(event) {
      dbInstance = event.target.result;
      
      dbInstance.onclose = function() {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };
    
    request.onerror = function() {
      reject(request.error);
    };
  });
}

function addData(storeName, data) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function updateData(storeName, data) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteData(storeName, id) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(Number(id));
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });
}

function getData(storeName, id) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(Number(id));
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllData(storeName) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

function clearStore(storeName) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });
}

async function clearAllDatabase() {
  for (const store of Object.values(STORES)) {
    await clearStore(store);
  }
}

function exportDatabaseData() {
  return Promise.all([
    getAllData(STORES.projects),
    getAllData(STORES.tasks),
    getAllData(STORES.team),
    getAllData(STORES.expenses)
  ]).then(([projects, tasks, team, expenses]) => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      tasks,
      team,
      expenses
    };
  });
}