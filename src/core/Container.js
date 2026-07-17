export class Container {
    services = new Map();
    register(name, instance) {
        this.services.set(name, instance);
    }
    resolve(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service not found in container: ${name}`);
        }
        return service;
    }
    has(name) {
        return this.services.has(name);
    }
}
