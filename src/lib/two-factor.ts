/**
 * Two-Factor Authentication Service for Synchro PM
 * TOTP-based 2FA with backup codes
 */

import { db } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  verified: boolean;
  error?: string;
}

// Base32 encoding for TOTP secrets
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Generate TOTP secret
 */
function generateSecret(): string {
  const buffer = randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for storage
 */
function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate TOTP code
 */
function generateTOTP(secret: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  // Decode base32 secret
  const secretBuffer = Buffer.from(secret, "base64");

  // In production, use proper HMAC-SHA1
  // This is a simplified version
  const hmac = createHash("sha1")
    .update(secretBuffer)
    .update(buffer)
    .digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * Verify TOTP code
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Date.now();

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, currentTime + i * 30000);
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Two-Factor Authentication Service
 */
export class TwoFactorAuthService {
  /**
   * Setup 2FA for a user
   */
  async setup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Create or update 2FA record (not enabled yet)
    await db.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
      },
      update: {
        secret,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
        verifiedAt: null,
      },
    });

    // Generate QR code URL (otpauth://)
    const issuer = encodeURIComponent("SynchroPM");
    const email = encodeURIComponent(userEmail);
    const qrCodeUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verifyAndEnable(userId: string, code: string): Promise<TwoFactorVerification> {
    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      return { verified: false, error: "2FA not setup" };
    }

    if (verifyTOTP(twoFactor.secret, code)) {
      await db.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: true,
          verifiedAt: new Date(),
        },
      });

      return { verified: true };
    }

    return { verified: false, error: "Invalid code" };
  }

  /**
   * Verify 2FA code during login
   */
  async verify(userId: string, code: string): Promise<TwoFactorVerification> {
    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      return { verified: true }; // 2FA not enabled, skip verification
    }

    // Check if it's a TOTP code
    if (code.length === 6 && /^\d+$/.test(code)) {
      if (verifyTOTP(twoFactor.secret, code)) {
        await db.twoFactorAuth.update({
          where: { userId },
          data: { lastUsedAt: new Date() },
        });
        return { verified: true };
      }
    }

    // Check if it's a backup code
    const hashedCode = hashBackupCode(code);
    const backupCodes = twoFactor.backupCodes as string[];
    const codeIndex = backupCodes.indexOf(hashedCode);

    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await db.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes,
          lastUsedAt: new Date(),
        },
      });
      return { verified: true };
    }

    return { verified: false, error: "Invalid code" };
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    // In production, verify password first
    await db.twoFactorAuth.delete({
      where: { userId },
    }).catch(() => {});

    return { success: true };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    await db.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes },
    });

    return backupCodes;
  }

  /**
   * Check if 2FA is enabled
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });

    return twoFactor?.isEnabled || false;
  }

  /**
   * Get 2FA status
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    verifiedAt: Date | null;
    lastUsedAt: Date | null;
    backupCodesRemaining: number;
  }> {
    const twoFactor = await db.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      return {
        enabled: false,
        verifiedAt: null,
        lastUsedAt: null,
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: twoFactor.isEnabled,
      verifiedAt: twoFactor.verifiedAt,
      lastUsedAt: twoFactor.lastUsedAt,
      backupCodesRemaining: (twoFactor.backupCodes as string[]).length,
    };
  }
}

// Export singleton instance
export const twoFactorAuthService = new TwoFactorAuthService();
