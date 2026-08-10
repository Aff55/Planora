export class KeyedSingleflight {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const current = operation();
    this.inFlight.set(key, current);
    void current.finally(() => {
      if (this.inFlight.get(key) === current) this.inFlight.delete(key);
    }).catch(() => undefined);
    return current;
  }
}
