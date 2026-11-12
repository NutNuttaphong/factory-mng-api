import * as crypto from 'crypto';

if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: crypto.webcrypto || crypto,
    writable: false,
    configurable: true,
  });
}
