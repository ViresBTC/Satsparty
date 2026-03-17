/**
 * SatsParty — Nostr Authentication Service
 *
 * Login con clave privada (nsec/hex) o extensión NIP-07 (Alby, nos2x, etc.)
 * Verifica que el pubkey corresponda al admin autorizado.
 */

import { getPublicKey } from "nostr-tools/pure";
import { decode, npubEncode } from "nostr-tools/nip19";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ── LOGIN CON CLAVE PRIVADA ──

/**
 * Autentica con una clave privada (nsec1... o hex de 64 chars)
 * @param {string} input - nsec1... o hex privkey
 * @returns {{ pubkey: string, npub: string }}
 */
export function loginWithPrivateKey(input) {
  const trimmed = input.trim();
  let secretKeyBytes;

  if (trimmed.startsWith("nsec1")) {
    try {
      const decoded = decode(trimmed);
      if (decoded.type !== "nsec") {
        throw new Error("No es una clave nsec válida");
      }
      secretKeyBytes = decoded.data;
    } catch (e) {
      throw new Error("nsec inválido. Verificá que esté bien copiado.");
    }
  } else if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    secretKeyBytes = hexToBytes(trimmed.toLowerCase());
  } else {
    throw new Error(
      "Formato inválido. Pegá tu nsec (nsec1...) o clave hex de 64 caracteres."
    );
  }

  const pubkey = getPublicKey(secretKeyBytes);
  const npub = npubEncode(pubkey);

  return { pubkey, npub };
}

// ── LOGIN CON EXTENSIÓN NIP-07 ──

/**
 * Verifica si hay una extensión Nostr (NIP-07) disponible
 */
export function hasNostrExtension() {
  return typeof window !== "undefined" && !!window.nostr;
}

/**
 * Autentica usando la extensión del browser (Alby, nos2x, etc.)
 * @returns {Promise<{ pubkey: string, npub: string }>}
 */
export async function loginWithExtension() {
  if (!window.nostr) {
    throw new Error(
      "No se detectó extensión Nostr. Instalá Alby u otra extensión compatible con NIP-07."
    );
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    const npub = npubEncode(pubkey);
    return { pubkey, npub };
  } catch (e) {
    if (e.message?.includes("denied") || e.message?.includes("rejected")) {
      throw new Error("Permiso denegado. Autorizá la conexión en tu extensión.");
    }
    throw new Error("Error conectando con la extensión: " + e.message);
  }
}

// ── (verifyAdmin eliminado — cada key accede a sus propios eventos) ──

/**
 * Trunca un npub para mostrar
 * npub1abc...xyz → npub1abc...xyz
 */
export function truncateNpub(npub) {
  if (!npub || npub.length < 20) return npub;
  return npub.slice(0, 12) + "..." + npub.slice(-6);
}
