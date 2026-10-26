import CryptoJS from 'crypto-js';

// Chave mestra interna da aplicação para criptografia simétrica robusta AES-256
const SECURITY_SECRET_KEY = 'BH_FOODS_DESOSSA_SECURITY_MASTER_KEY_2026_#!';
const CIPHER_PREFIX = 'ENC:AES:';

/**
 * Criptografa uma senha em texto plano utilizando AES-256 (com Salt e IV gerados automaticamente pelo CryptoJS).
 * Retorna o ciphertext com o prefixo 'ENC:AES:'.
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return '';
  const trimmed = plainText.trim();
  if (trimmed.startsWith(CIPHER_PREFIX)) {
    return trimmed; // Já está criptografada
  }
  try {
    const ciphertext = CryptoJS.AES.encrypt(trimmed, SECURITY_SECRET_KEY).toString();
    return `${CIPHER_PREFIX}${ciphertext}`;
  } catch (error) {
    console.error('Erro ao criptografar senha:', error);
    return trimmed;
  }
}

/**
 * Descriptografa uma senha criptografada em AES-256.
 * Se a senha for legado (texto plano), retorna ela mesma com segurança.
 */
export function decryptPassword(storedPassword?: string): string {
  if (!storedPassword) return '';
  const trimmed = storedPassword.trim();
  if (!trimmed.startsWith(CIPHER_PREFIX)) {
    return trimmed; // Senha legado em texto plano
  }

  try {
    const rawCipher = trimmed.slice(CIPHER_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(rawCipher, SECURITY_SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || trimmed;
  } catch (error) {
    console.error('Erro ao descriptografar senha:', error);
    return '••••••••';
  }
}

/**
 * Verifica se uma senha armazenada está no formato criptografado AES-256.
 */
export function isPasswordEncrypted(storedPassword?: string): boolean {
  if (!storedPassword) return false;
  return storedPassword.trim().startsWith(CIPHER_PREFIX);
}

/**
 * Compara a senha digitada pelo usuário na tela de login com a senha armazenada (criptografada).
 */
export function verifyPassword(enteredPassword: string, storedPassword?: string): boolean {
  if (!enteredPassword || !storedPassword) return false;
  const cleanEntered = enteredPassword.trim();
  const decrypted = decryptPassword(storedPassword);
  return cleanEntered === decrypted;
}
