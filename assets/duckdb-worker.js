let duckdb = null;
let db = null;
let isInitializing = false;
let initPromise = null;

const loadDuckDB = async () => {
  if (duckdb) return duckdb;
  duckdb = await import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.1-dev106.0/+esm");
  return duckdb;
};

const getDb = async () => {
  if (db) return db;
  
  if (isInitializing) {
    return initPromise;
  }
  
  isInitializing = true;
  initPromise = (async () => {
    const duckdbModule = await loadDuckDB();
    const JSDELIVR_BUNDLES = duckdbModule.getJsDelivrBundles();
    
    const bundle = await duckdbModule.selectBundle(JSDELIVR_BUNDLES);
    
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: "text/javascript",
      })
    );
    
    const worker = new Worker(worker_url);
    const logger = new duckdbModule.ConsoleLogger();
    db = new duckdbModule.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);
    
    isInitializing = false;
    return db;
  })();
  
  return initPromise;
};

self.onmessage = async (event) => {
  const { type, sql, requestId } = event.data;

  try {
    if (type === 'init') {
      await getDb();
      postMessage({ type: 'init-done', requestId });
      return;
    }
    if (type === 'query') {
      const database = await getDb();
      const conn = await database.connect();
      const result = await conn.query(sql);
      const resultArray = result.toArray().map(v=>v.toJSON());
      conn.close();
      
      postMessage({ 
        type: 'query-result', 
        result: resultArray, 
        requestId 
      });
      return;
    }

    postMessage({ 
      type: 'error', 
      error: `Unknown message type: ${type}`, 
      requestId 
    });
  } catch (error) {
    postMessage({ 
      type: 'error', 
      error: error.message || String(error), 
      requestId 
    });
  }
};