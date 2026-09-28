const Module = require('module');
const originalRequire = Module.prototype.require;
const RedisMock = require('ioredis-mock');

class CustomRedisMock extends RedisMock {
  constructor(...args) {
    super(...args);
    this.status = 'ready';
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }
}

Module.prototype.require = function(id) {
  if (id === 'ioredis') {
    return CustomRedisMock;
  }
  return originalRequire.apply(this, arguments);
};
