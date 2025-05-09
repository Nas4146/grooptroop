import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class EncryptionService {
    // Check if PRNG is available
    static checkPRNG(): boolean {
        try {
          // Test if we can generate random bytes
          const testBytes = nacl.randomBytes(16);
          return testBytes.length === 16;
        } catch (error) {
          console.error('[ENCRYPTION] PRNG check failed:', error);
          return false;
        }
      }
  // Generate a new key pair for a user
    static async generateAndStoreUserKeys(userId: string): Promise<{ publicKey: string, secretKey: string }> {
    try {
      if (!this.checkPRNG()) {
        throw new Error('Secure random number generator not available');
      }
      
      const keyPair = nacl.box.keyPair();
      const keys = {
        publicKey: util.encodeBase64(keyPair.publicKey),
        secretKey: util.encodeBase64(keyPair.secretKey)
      };
      
      await AsyncStorage.setItem(`keys_${userId}`, JSON.stringify(keys));
      console.log('[ENCRYPTION] Successfully generated and stored keys for user:', userId);
      return keys;
    } catch (error) {
      console.error('[ENCRYPTION] Error generating keys:', error);
      throw error;
    }
  }
  
  // Get a user's key pair
    static async getUserKeys(userId: string): Promise<{ publicKey: string, secretKey: string } | null> {
    const storedKeys = await AsyncStorage.getItem(`keys_${userId}`);
    if (!storedKeys) return null;
    return JSON.parse(storedKeys);
  }
  
  // Generate a shared secret for a groop
  static async generateGroopKey(groopId: string): Promise<string | null> {
    try {
      if (!this.checkPRNG()) {
        throw new Error('Secure random number generator not available');
      }
      
      // Generate a random symmetric key
      const key = nacl.randomBytes(nacl.secretbox.keyLength);
      const keyBase64 = util.encodeBase64(key);
      
      // Store it securely
      await AsyncStorage.setItem(`groop_key_${groopId}`, keyBase64);
      console.log('[ENCRYPTION] Generated new key for groop:', groopId);
      return keyBase64;
    } catch (error) {
      console.error('[ENCRYPTION] Error generating groop key:', error);
      return null;
    }
  }
  
  static async verifyGroopKey(groopId: string, key: string): Promise<boolean> {
    try {
      // Basic validation
      const decodedKey = util.decodeBase64(key);
      return decodedKey.length === nacl.secretbox.keyLength;
    } catch (error) {
      console.error('[ENCRYPTION] Key verification failed:', error);
      return false;
    }
  }

  // Get a groop's encryption key
  static async getGroopKey(groopId: string): Promise<string | null> {
    return AsyncStorage.getItem(`groop_key_${groopId}`);
  }
  
  // Encrypt a message using the groop key
  static async encryptMessage(message: string, groopId: string): Promise<string | null> {
    const groopKey = await this.getGroopKey(groopId);
    if (!groopKey) return null;
    
    const keyBytes = util.decodeBase64(groopKey);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = util.decodeUTF8(message);
    
    const encrypted = nacl.secretbox(messageBytes, nonce, keyBytes);
    
    // Combine nonce and encrypted message
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);
    
    return util.encodeBase64(fullMessage);
  }

  static validateKey(key: string, expectedLength: number): boolean {
    try {
      const decoded = util.decodeBase64(key);
      return decoded.length === expectedLength;
    } catch (error) {
      return false;
    }
  }
  
  // Decrypt a message using the groop key
  static async decryptMessage(encryptedMessage: string, groopId: string): Promise<string | null> {
    const groopKey = await this.getGroopKey(groopId);
    if (!groopKey || !this.validateKey(groopKey, nacl.secretbox.keyLength)) {
      return null;
    }
    
    const keyBytes = util.decodeBase64(groopKey);
    const messageBytes = util.decodeBase64(encryptedMessage);
    
    const nonce = messageBytes.slice(0, nacl.secretbox.nonceLength);
    const message = messageBytes.slice(nacl.secretbox.nonceLength);
    
    const decrypted = nacl.secretbox.open(message, nonce, keyBytes);
    if (!decrypted) return null;
    
    return util.encodeUTF8(decrypted);
  }
  
  // Share a groop key with a new user (encrypt with their public key)
  static async shareGroopKey(groopId: string, recipientPublicKey: string, senderSecretKey: string): Promise<string | null> {
    try {
      if (!this.checkPRNG()) {
        console.error('[ENCRYPTION] PRNG not available for sharing group key');
        return null;
      }
      
      const groopKey = await this.getGroopKey(groopId);
      if (!groopKey) {
        console.error('[ENCRYPTION] No group key found for sharing');
        return null;
      }
    
    const keyBytes = util.decodeBase64(groopKey);
    const recipientKeyBytes = util.decodeBase64(recipientPublicKey);
    const senderKeyBytes = util.decodeBase64(senderSecretKey);
    
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    
    const encrypted = nacl.box(
      keyBytes,
      nonce,
      recipientKeyBytes,
      senderKeyBytes
    );
    
    // Combine nonce and encrypted message
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);
    
    return util.encodeBase64(fullMessage);  
    } catch (error) {
        console.error('[ENCRYPTION] Error sharing group key:', error);
    return null;
    }
}
  
  // Receive a shared groop key (decrypt with recipient's secret key)
  static async receiveGroopKey(encryptedKey: string, senderPublicKey: string, recipientSecretKey: string, groopId: string): Promise<boolean> {
    try {
      const senderKeyBytes = util.decodeBase64(senderPublicKey);
      const recipientKeyBytes = util.decodeBase64(recipientSecretKey);
      const messageBytes = util.decodeBase64(encryptedKey);
      
      const nonce = messageBytes.slice(0, nacl.box.nonceLength);
      const message = messageBytes.slice(nacl.box.nonceLength);
      
      const decrypted = nacl.box.open(
        message,
        nonce,
        senderKeyBytes,
        recipientKeyBytes
      );
      
      if (!decrypted) return false;
      
      const groopKey = util.encodeBase64(decrypted);
      await AsyncStorage.setItem(`groop_key_${groopId}`, groopKey);
      
      return true;
    } catch (error) {
      console.error('[ENCRYPTION] Error receiving group key:', error);
      return false;
    }
  }
}