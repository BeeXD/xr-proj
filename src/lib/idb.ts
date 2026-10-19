export interface ExperimentRecord {
  id: string
  title: string
  module: string
  timestamp: string
}

const DB_NAME = 'algospace-xr'
const STORE_NAME = 'experiments'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The local experiment database could not be opened.'))
  })
}

export async function saveExperiment(record: ExperimentRecord): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('The experiment could not be saved.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving the experiment was aborted.'))
      transaction.objectStore(STORE_NAME).put(record)
    })
  } finally {
    database.close()
  }
}

export async function loadExperiments(): Promise<ExperimentRecord[]> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).getAll()
      let records: ExperimentRecord[] = []
      request.onsuccess = () => { records = request.result as ExperimentRecord[] }
      transaction.oncomplete = () => resolve(records)
      transaction.onerror = () => reject(transaction.error ?? new Error('Saved experiments could not be loaded.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Loading saved experiments was aborted.'))
    })
  } finally {
    database.close()
  }
}
