import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class EncryptionService {
  // Generate a new key pair for a user
  static async generateAndStoreUserKeys(userId: string): Promise<{ publicKey: string, secretKey: string }> {
    const keyPair = nacl.box.keyPair();
    const keys = {
      publicKey: util.encodeBase64(keyPair.publicKey),
      secretKey: util.encodeBase64(keyPair.secretKey)
    };
    
    await AsyncStorage.setItem(`keys_${userId}`, JSON.stringify(keys));
    return keys;
  }
  
  // Get a user's key pair
  static async getUserKeys(userId: string): Promise<{ publicKey: string, secretKey: string } | null> {
    const storedKeys = await AsyncStorage.getItem(`keys_${userId}`);
    if (!storedKeys) return null;
    return JSON.parse(storedKeys);
  }
  
  // Generate a shared secret for a groop
  static async generateGroopKey(groopId: string): Promise<string> {
    const key = nacl.randomBytes(32);
    const groopKey = util.encodeBase64(key);
    await AsyncStorage.setItem(`groop_key_${groopId}`, groopKey);
    return groopKey;
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
  
  // Decrypt a message using the groop key
  static async decryptMessage(encryptedMessage: string, groopId: string): Promise<string | null> {
    const groopKey = await this.getGroopKey(groopId);
    if (!groopKey) return null;
    
    const keyBytes = util.decodeBase64(groopKey);
    const messageBytes = util.decodeBase64(encryptedMessage);
    
    const nonce = messageBytes.slice(0, nacl.secretbox.nonceLength);
    const message = messageBytes.slice(nacl.secretbox.nonceLength);
    
    const decrypted = nacl.secretbox.open(message, nonce, keyBytes);
    if (!decrypted) return null;
    
    return util.encodeUTF8(decrypted);
  }
  
  // Share a groop key with a new user (encrypt with their public key)
  static async shareGroopKey(groopId: string, recipientPublicKey: string, senderSecretKey: string): Promise<string> {
    const groopKey = await this.getGroopKey(groopId);
    if (!groopKey) throw new Error('No groop key found');
    
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
  }
  
  // Receive a shared groop key (decrypt with recipient's secret key)
  static async receiveGroopKey(encryptedKey: string, senderPublicKey: string, recipientSecretKey: string, groopId: string): Promise<boolean> {
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
  }
}