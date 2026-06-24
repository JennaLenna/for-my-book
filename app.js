const FILE_KEYS = ['characters', 'chapters', 'worldbuilding', 'notes', 'timeline'];
const DB_NAME = 'bookPlannerIndexedDb';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const STORE_KEY = 'plannerData';
const AUTOSAVE_DELAY_MS = 1500;
const SYNC_RETRY_INTERVAL_MS = 15000;

class SingleUserBookPlanner {
    constructor() {
        this.apiBase = (window.BOOK_PLANNER_API || '').replace(/\/$/, '');
        this.state = {
            files: this.createEmptyFiles(),
            updatedAt: 0,
            dirty: false
        };

        this.autosaveTimer = null;
        this.retryTimer = null;

        this.elements = {
            plannerSections: document.getElementById('plannerSections'),
            saveBtn: document.getElementById('saveBtn'),
            syncStatus: document.getElementById('syncStatus'),
            connectionStatus: document.getElementById('connectionStatus')
        };

        this.renderSections();
        this.attachEventListeners();
        this.initialize().catch((error) => {
            this.setSyncStatus(`Initialization failed: ${error.message}`, 'error');
        });
    }

    createEmptyFiles() {
        return Object.fromEntries(FILE_KEYS.map((key) => [key, { content: '', updatedAt: 0 }]));
    }

    renderSections() {
        this.elements.plannerSections.innerHTML = '';

        for (const key of FILE_KEYS) {
            const panel = document.createElement('section');
            panel.className = 'panel';

            const title = document.createElement('h2');
            title.textContent = this.prettifyKey(key);

            const textarea = document.createElement('textarea');
            textarea.id = `field-${key}`;
            textarea.dataset.key = key;
            textarea.placeholder = `Write your ${this.prettifyKey(key).toLowerCase()} notes here...`;

            panel.appendChild(title);
            panel.appendChild(textarea);
            this.elements.plannerSections.appendChild(panel);
        }
    }

    attachEventListeners() {
        this.elements.saveBtn.addEventListener('click', () => {
            this.syncNow({ manual: true });
        });

        this.elements.plannerSections.addEventListener('input', (event) => {
            const key = event.target?.dataset?.key;
            if (!key || !FILE_KEYS.includes(key)) return;

            this.state.files[key] = {
                content: event.target.value,
                updatedAt: Date.now()
            };
            this.state.updatedAt = Date.now();
            this.state.dirty = true;

            this.persistLocalState();
            this.setSyncStatus('Local changes saved. Waiting to sync...', 'warn');
            this.scheduleAutosave();
        });

        window.addEventListener('online', () => {
            this.updateConnectionStatus();
            if (this.state.dirty) {
                this.syncNow();
            }
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus();
            this.setSyncStatus('Offline mode: data is saved locally and will sync later.', 'warn');
        });
    }

    async initialize() {
        this.updateConnectionStatus();

        await this.loadFromIndexedDb();
        this.applyStateToUI();

        if (!this.apiBase) {
            this.setSyncStatus('Set window.BOOK_PLANNER_API in index.html to enable cloud sync.', 'error');
            return;
        }

        await this.pullRemoteState();

        if (this.state.dirty && navigator.onLine) {
            await this.syncNow();
        } else {
            this.setSyncStatus('Ready.', 'ok');
        }
    }

    async pullRemoteState() {
        if (!navigator.onLine) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/planner`, {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Load failed (${response.status})`);
            }

            const remoteState = await response.json();
            const normalizedRemote = this.normalizeRemoteState(remoteState);

            const shouldReplaceLocal = !this.state.dirty || normalizedRemote.updatedAt >= this.state.updatedAt;
            if (shouldReplaceLocal) {
                this.state.files = normalizedRemote.files;
                this.state.updatedAt = normalizedRemote.updatedAt;
                this.state.dirty = false;
                this.applyStateToUI();
                await this.persistLocalState();
                this.setSyncStatus('Loaded latest data from GitHub.', 'ok');
            }
        } catch (error) {
            this.setSyncStatus(`Could not load cloud data: ${error.message}`, 'warn');
        }
    }

    normalizeRemoteState(remote) {
        const files = this.createEmptyFiles();
        let latestUpdatedAt = 0;

        for (const key of FILE_KEYS) {
            const remoteFile = remote?.files?.[key] || {};
            const content = typeof remoteFile.content === 'string' ? remoteFile.content : '';
            const updatedAt = Number(remoteFile.updatedAt) || 0;
            files[key] = { content, updatedAt };
            latestUpdatedAt = Math.max(latestUpdatedAt, updatedAt);
        }

        return {
            files,
            updatedAt: Number(remote?.updatedAt) || latestUpdatedAt || 0
        };
    }

    async syncNow({ manual = false } = {}) {
        clearTimeout(this.autosaveTimer);

        if (!this.apiBase) {
            this.setSyncStatus('Cannot sync yet: API URL is not configured.', 'error');
            return;
        }

        if (!navigator.onLine) {
            this.setSyncStatus('Offline: changes are cached and will sync when online.', 'warn');
            this.queueRetry();
            return;
        }

        this.elements.saveBtn.disabled = true;
        this.setSyncStatus(manual ? 'Saving...' : 'Syncing...', 'warn');

        try {
            const payload = {
                files: this.state.files,
                updatedAt: Date.now()
            };

            const response = await fetch(`${this.apiBase}/planner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Save failed (${response.status})`);
            }

            const result = await response.json();
            this.state.updatedAt = Number(result.updatedAt) || Date.now();
            this.state.dirty = false;
            await this.persistLocalState();
            this.setSyncStatus('All changes synced to GitHub.', 'ok');
            clearTimeout(this.retryTimer);
        } catch (error) {
            this.setSyncStatus(`Sync error: ${error.message}. Local cache is safe.`, 'error');
            this.queueRetry();
        } finally {
            this.elements.saveBtn.disabled = false;
        }
    }

    queueRetry() {
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
            if (this.state.dirty && navigator.onLine) {
                this.syncNow();
            }
        }, SYNC_RETRY_INTERVAL_MS);
    }

    scheduleAutosave() {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = setTimeout(() => {
            this.syncNow();
        }, AUTOSAVE_DELAY_MS);
    }

    setSyncStatus(message, level = 'ok') {
        this.elements.syncStatus.textContent = message;
        this.elements.syncStatus.className = `status-${level}`;
    }

    updateConnectionStatus() {
        this.elements.connectionStatus.textContent = navigator.onLine ? 'Online' : 'Offline';
        this.elements.connectionStatus.className = navigator.onLine ? 'status-ok' : 'status-warn';
    }

    prettifyKey(key) {
        return key.charAt(0).toUpperCase() + key.slice(1);
    }

    applyStateToUI() {
        for (const key of FILE_KEYS) {
            const element = document.getElementById(`field-${key}`);
            if (!element) continue;
            element.value = this.state.files[key]?.content || '';
        }
    }

    async loadFromIndexedDb() {
        try {
            const cached = await this.idbGet(STORE_KEY);
            if (!cached) return;

            const normalized = this.normalizeRemoteState(cached);
            this.state.files = normalized.files;
            this.state.updatedAt = Number(cached.updatedAt) || normalized.updatedAt;
            this.state.dirty = Boolean(cached.dirty);
        } catch (error) {
            this.setSyncStatus(`Could not read local cache: ${error.message}`, 'warn');
        }
    }

    async persistLocalState() {
        try {
            await this.idbSet(STORE_KEY, {
                files: this.state.files,
                updatedAt: this.state.updatedAt,
                dirty: this.state.dirty
            });
        } catch (error) {
            this.setSyncStatus(`Could not persist local cache: ${error.message}`, 'error');
        }
    }

    openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async idbGet(key) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async idbSet(key, value) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SingleUserBookPlanner();
});
