// src/utils/tokenManager.ts
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'encrypted_token_data_polyglot_gate_server';
// 使用一个固定的加密密钥（在实际应用中，你可能想要从环境变量或其他安全的地方获取）
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '#IE$aw%HF*tGkia^9%QC3&MU80Hvaw4I';

interface TokenData {
  token: string;
  expiresAt: number;
}

export class TokenManager {
  // 加密数据
  private static encrypt(data: TokenData): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  }

  // 解密数据
  private static decrypt(encryptedData: string): TokenData | null {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // 保存 token
  static saveToken(token: string, expirationHours: number = 24): void {
    const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000);
    const tokenData: TokenData = {
      token,
      expiresAt
    };
    const encryptedData = this.encrypt(tokenData);
    localStorage.setItem(STORAGE_KEY, encryptedData);
  }

  // 获取 token
  static getToken(): { token: string | null, isExpired: boolean } {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) {
      return { token: null, isExpired: false };
    }

    const tokenData = this.decrypt(encryptedData);
    if (!tokenData) {
      return { token: null, isExpired: false };
    }

    const isExpired = Date.now() > tokenData.expiresAt;
    return {
      token: isExpired ? null : tokenData.token,
      isExpired
    };
  }

  // 清除 token
  static clearToken(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // 获取过期时间
  static getExpirationTime(): Date | null {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) {
      return null;
    }

    const tokenData = this.decrypt(encryptedData);
    if (!tokenData) {
      return null;
    }

    return new Date(tokenData.expiresAt);
  }

  // 检查是否过期
  static isExpired(): boolean {
    const { isExpired } = this.getToken();
    return isExpired;
  }
}