export class SessionToolCache {
  private cache = new Map<string, { argsStr: string; result: any; timestamp: number }>();

  get(name: string, args: any): any | null {
    const key = name;
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Very basic TTL or matching logic
    const argsStr = JSON.stringify(args || {});
    if (entry.argsStr !== argsStr) return null;

    return entry.result;
  }

  set(name: string, args: any, result: any): void {
    const argsStr = JSON.stringify(args || {});
    this.cache.set(name, { argsStr, result, timestamp: Date.now() });
  }
}
