/**
 * crypto.js — Password hashing with PBKDF2 (Web Crypto API)
 * All crypto stays in browser — no server, no leaks.
 */

const CryptoUtil = {
  /**
   * Hash password with PBKDF2 + random salt
   * Returns { hash, salt } as hex strings
   */
  async hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return {
      hash: Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('')
    };
  },

  /**
   * Verify password against stored hash+salt
   */
  async verifyPassword(password, storedHash, storedSalt) {
    const salt = new Uint8Array(storedSalt.match(/.{2}/g).map(h => parseInt(h, 16)));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
    return hash === storedHash;
  },

  /**
   * Encrypt sensitive data (API key) with AES-GCM
   * Key derived from user's password
   */
  async encryptData(data, password) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode('crstats-v1'), iterations: 50000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    return {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2,'0')).join(''),
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2,'0')).join('')
    };
  },

  /**
   * Decrypt sensitive data with AES-GCM
   */
  async decryptData(encryptedObj, password) {
    const iv = new Uint8Array(encryptedObj.iv.match(/.{2}/g).map(h => parseInt(h, 16)));
    const data = new Uint8Array(encryptedObj.data.match(/.{2}/g).map(h => parseInt(h, 16)));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode('crstats-v1'), iterations: 50000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  }
};
