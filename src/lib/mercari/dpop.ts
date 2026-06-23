import * as crypto from 'node:crypto';
import { SignJWT, exportJWK } from 'jose';

let keyPair: { publicKey: unknown; privateKey: unknown } | null = null;
let cachedJwk: Record<string, unknown> | null = null;

async function getKeyPair(): Promise<{ publicKey: unknown; privateKey: unknown }> {
  if (!keyPair) {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as unknown as { publicKey: unknown; privateKey: unknown };
    keyPair = pair;
  }
  return keyPair;
}

async function getPublicJwk(): Promise<Record<string, unknown>> {
  if (!cachedJwk) {
    const kp = await getKeyPair();
    const full = await exportJWK(kp.publicKey as crypto.KeyObject);
    cachedJwk = { crv: full.crv, kty: full.kty, x: full.x, y: full.y };
  }
  return cachedJwk;
}

export async function generateDPoP(url: string, method: string, uuid: string): Promise<string> {
  const kp = await getKeyPair();
  const jwk = await getPublicJwk();

  return new SignJWT({ htu: url, htm: method, uuid })
    .setProtectedHeader({ typ: 'dpop+jwt', alg: 'ES256', jwk })
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .sign(kp.privateKey as crypto.KeyObject);
}
