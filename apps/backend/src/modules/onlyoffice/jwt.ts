import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export function signToken(payload: JWTPayload, secret: string): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secretKey(secret));
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ['HS256'] });
  return payload;
}

export function bearerToken(header: string | undefined): string | undefined {
  return header?.match(/^Bearer\s+(.+)$/i)?.[1];
}
