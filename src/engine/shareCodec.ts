/**
 * shareCodec.ts — 挑战链接编解码
 * DNA → 压缩 JSON → base64url，嵌入 /world/{worldId}?w={encoded}
 */

import type { WorldDNA } from './dna';
import { sanitizeWorldDNA } from './dna';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** DNA 的可分享子集：去掉本地字段，减小链接体积 */
function toSharePayload(dna: WorldDNA): Record<string, unknown> {
  const { schemaVersion, ...rest } = dna;
  return { v: schemaVersion, ...rest };
}

/** 编码世界 DNA 为 base64url 字符串（可放入 ?w= 参数） */
export function encodeWorldToUrl(dna: WorldDNA): string {
  return toBase64Url(JSON.stringify(toSharePayload(dna)));
}

/** 从 ?w= 参数解码世界 DNA；失败返回 null */
export function decodeWorldFromUrl(param: string): WorldDNA | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(param));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { v, ...rest } = parsed as Record<string, unknown>;
    const { dna } = sanitizeWorldDNA({ schemaVersion: typeof v === 'number' ? v : 1, ...rest });
    return dna;
  } catch {
    return null;
  }
}

/** 生成完整挑战链接路径（SPA 内部路径，非绝对 URL） */
export function buildChallengePath(dna: WorldDNA): string {
  const worldId = dna.worldCode;
  return `/world/${encodeURIComponent(worldId)}?w=${encodeWorldToUrl(dna)}`;
}
