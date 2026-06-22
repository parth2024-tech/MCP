export class Container {
  private services = new Map<string, any>();

  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found in container: ${name}`);
    }
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}
