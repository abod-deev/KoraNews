import crypto from 'crypto';

const KEY_LENGTH = 64;
const COST = 16384; // N
const BLOCK_SIZE = 8; // r
const PARALLELIZATION = 1; // p

/**
 * Hashes a plaintext password using Node.js crypto.scrypt with a random 16-byte salt.
 * Output format: scrypt:saltHex:derivedKeyHex
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      plainPassword,
      salt,
      KEY_LENGTH,
      { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 32 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
      }
    );
  });
}

/**
 * Synchronous version for testing or initialization if needed
 */
export function hashPasswordSync(plainPassword: string): string {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 32 * 1024 * 1024,
  });
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a candidate plaintext password against a stored scrypt hash or handles legacy plaintext passwords.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export async function verifyPassword(
  candidatePlain: string,
  storedHashOrPlain: string | null | undefined
): Promise<{ isValid: boolean; needsMigration: boolean }> {
  if (!candidatePlain || !storedHashOrPlain) {
    return { isValid: false, needsMigration: false };
  }

  // 1. If stored value starts with 'scrypt:'
  if (storedHashOrPlain.startsWith('scrypt:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 3) {
      return { isValid: false, needsMigration: false };
    }

    const [, salt, expectedKeyHex] = parts;

    return new Promise((resolve) => {
      crypto.scrypt(
        candidatePlain,
        salt,
        KEY_LENGTH,
        { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 32 * 1024 * 1024 },
        (err, derivedKey) => {
          if (err) {
            return resolve({ isValid: false, needsMigration: false });
          }

          const derivedHex = derivedKey.toString('hex');
          const expectedBuffer = Buffer.from(expectedKeyHex, 'hex');
          const derivedBuffer = Buffer.from(derivedHex, 'hex');

          if (expectedBuffer.length !== derivedBuffer.length) {
            return resolve({ isValid: false, needsMigration: false });
          }

          const isValid = crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
          resolve({ isValid, needsMigration: false });
        }
      );
    });
  }

  // 2. Legacy Plaintext comparison (with timing safe check)
  const candidateBuf = Buffer.from(candidatePlain, 'utf-8');
  const storedBuf = Buffer.from(storedHashOrPlain, 'utf-8');

  let isPlainMatch = false;
  if (candidateBuf.length === storedBuf.length) {
    isPlainMatch = crypto.timingSafeEqual(candidateBuf, storedBuf);
  }

  return {
    isValid: isPlainMatch,
    needsMigration: isPlainMatch, // If it matches legacy plaintext, flag for automatic migration to scrypt
  };
}
