// ---------------------------------------------------------------------------
// Versioned localStorage wrapper with an in-memory fallback — pure (takes the
// storage object as a parameter so it can be tested without a browser).
// ---------------------------------------------------------------------------
export function createStore(key, { version, defaults, migrate = (d) => d, storage } = {}) {
  let backend = storage;
  if (backend === undefined) {
    try {
      backend = globalThis.localStorage;
      const probe = `${key}__probe`;
      backend.setItem(probe, '1');
      backend.removeItem(probe);
    } catch {
      backend = null; // private mode, disabled storage, sandboxed iframe…
    }
  }
  const memory = new Map();

  function readRaw() {
    try {
      return backend ? backend.getItem(key) : memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  }

  function writeRaw(value) {
    memory.set(key, value);
    try {
      backend?.setItem(key, value);
    } catch {
      /* quota or permission: keep the in-memory copy */
    }
  }

  return {
    get persistent() {
      return !!backend;
    },

    load() {
      const raw = readRaw();
      if (!raw) return structuredClone(defaults);
      try {
        const parsed = JSON.parse(raw);
        const data = parsed.v === version ? parsed.data : migrate(parsed.data, parsed.v);
        return mergeDefaults(defaults, data);
      } catch {
        return structuredClone(defaults);
      }
    },

    save(data) {
      writeRaw(JSON.stringify({ v: version, data }));
    },
  };
}

/** Deep-merge saved data over defaults so new settings get their default. */
export function mergeDefaults(defaults, data) {
  if (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults)) {
    return data === undefined ? structuredClone(defaults) : data;
  }
  const out = {};
  for (const k of Object.keys(defaults)) {
    out[k] = data && k in data ? mergeDefaults(defaults[k], data[k]) : structuredClone(defaults[k]);
  }
  return out;
}
