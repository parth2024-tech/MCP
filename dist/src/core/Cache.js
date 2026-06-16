"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionToolCache = void 0;
class SessionToolCache {
    cache = new Map();
    get(name, args) {
        const key = name;
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Very basic TTL or matching logic
        const argsStr = JSON.stringify(args || {});
        if (entry.argsStr !== argsStr)
            return null;
        return entry.result;
    }
    set(name, args, result) {
        const argsStr = JSON.stringify(args || {});
        this.cache.set(name, { argsStr, result, timestamp: Date.now() });
    }
}
exports.SessionToolCache = SessionToolCache;
