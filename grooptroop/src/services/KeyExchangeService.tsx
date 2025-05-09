import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    query, 
    where, 
    updateDoc, 
    serverTimestamp,
    deleteDoc 
  } from 'firebase/firestore';
  import { db } from '../lib/firebase';
  import { EncryptionService } from './EncryptionService';
  import nacl from 'tweetnacl';
  import util from 'tweetnacl-util';
  
  /**
   * Service for managing encryption key exchange between users in a group
   * Handles secure distribution of keys when users join a group
   */
  export class KeyExchangeService {
    
    /**
     * Setup initial encryption for a new group
     * @param groopId The ID of the group to setup encryption for
     * @param creatorId The user ID of the group creator
     */
    static async setupGroopEncryption(groopId: string, creatorId: string): Promise<boolean> {
      try {
        if (!EncryptionService.checkPRNG()) {
          console.error('[KEY_EXCHANGE] PRNG not available for setup encryption');
          return false;
        }

        console.log('[KEY_EXCHANGE] Setting up initial encryption for groop:', groopId);

        // Generate a new symmetric key for the groop
        const groopKey = await EncryptionService.generateGroopKey(groopId);
        
        // Store information about encryption (but not the key itself) in Firestore
        const groopRef = doc(db, 'groops', groopId);
        await updateDoc(groopRef, {
          encryptionEnabled: true,
          encryptionSetupBy: creatorId,
          encryptionSetupAt: serverTimestamp()
        });
        
        console.log('[KEY_EXCHANGE] Encryption successfully set up for groop');
        return true;
      } catch (error) {
        console.error('[KEY_EXCHANGE] Error setting up groop encryption:', error);
        return false;
      }
    }
    
    /**
     * Share the group encryption key with a new member
     * @param groopId The ID of the group
     * @param newMemberId The user ID of the new member
     * @param currentUserId The user ID of the current user sharing the key
     */
    static async shareGroopKeyWithMember(groopId: string, newMemberId: string, currentUserId: string): Promise<boolean> {
      try {
        console.log(`[KEY_EXCHANGE] Sharing groop key for ${groopId} with user ${newMemberId}`);
        
        // Get the public key of the new member
        const userRef = doc(db, 'users', newMemberId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.error('[KEY_EXCHANGE] User not found');
          return false;
        }
        
        const newMemberPublicKey = userSnap.data().publicKey;
        if (!newMemberPublicKey) {
          console.error('[KEY_EXCHANGE] New member does not have a public key');
          
          // Update user document with a flag indicating they need to generate keys
          await updateDoc(userRef, {
            needsKeyGeneration: true
          });
          
          return false;
        }
        
        // Get the current user's keys
        const currentUserKeys = await EncryptionService.getUserKeys(currentUserId);
        if (!currentUserKeys) {
          console.error('[KEY_EXCHANGE] Current user keys not found');
          return false;
        }
        
        // Encrypt the groop key with the new member's public key
        const encryptedKey = await EncryptionService.shareGroopKey(
          groopId,
          newMemberPublicKey,
          currentUserKeys.secretKey
        );

        if (!encryptedKey) {
          console.error('[KEY_EXCHANGE] Failed to encrypt group key for sharing');
          return false;
        }
        
        // Store the encrypted key for the new member
        const keyExchangeRef = collection(db, `groops/${groopId}/keyExchanges`);
        await addDoc(keyExchangeRef, {
          recipientId: newMemberId,
          senderId: currentUserId,
          encryptedKey: encryptedKey,
          createdAt: serverTimestamp(),
          status: 'pending'
        });
        
        console.log('[KEY_EXCHANGE] Successfully shared key with new member');
        return true;
      } catch (error) {
        console.error('[KEY_EXCHANGE] Error sharing groop key:', error);
        return false;
      }
    }
    
    /**
     * Process any pending key exchanges for the current user 
     * @param userId The ID of the current user
     */
    static async processPendingKeyExchanges(userId: string): Promise<void> {
      try {
        console.log('[KEY_EXCHANGE] Processing pending key exchanges for user:', userId);
        
        // Check if PRNG is available before attempting key operations
        if (!EncryptionService.checkPRNG()) {
          console.error('[KEY_EXCHANGE] Secure random number generator not available');
          return;
        }
        
        // Get user's keys
        let userKeys: { publicKey: string, secretKey: string } | null = null;
    
        try {
          userKeys = await EncryptionService.getUserKeys(userId);
          if (!userKeys) {
            console.log('[KEY_EXCHANGE] User keys not found. Generating new keys.');
            userKeys = await EncryptionService.generateAndStoreUserKeys(userId);
            
            // Update user's public key in Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              publicKey: userKeys.publicKey,
              needsKeyGeneration: false
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Secure random number generator not available') {
            console.error('[KEY_EXCHANGE] Cannot process key exchanges: secure random generator not available');
            return;
          }
          throw error;
        }
        
        // Find all groups the user is a member of
        const groopsRef = collection(db, 'groops');
        const q = query(groopsRef, where('members', 'array-contains', userId));
        const groopsSnap = await getDocs(q);
        
        let processedKeys = 0;
        
        for (const groopDoc of groopsSnap.docs) {
          const groopId = groopDoc.id;
          
          // Check if there are pending key exchanges for this groop
          const keyExchangeRef = collection(db, `groops/${groopId}/keyExchanges`);
          const keyQuery = query(keyExchangeRef, where('recipientId', '==', userId), where('status', '==', 'pending'));
          const keyExchangesSnap = await getDocs(keyQuery);
          
          console.log(`[KEY_EXCHANGE] Found ${keyExchangesSnap.size} pending key exchanges for groop ${groopId}`);
          
          for (const keyExchangeDoc of keyExchangesSnap.docs) {
            const keyExchange = keyExchangeDoc.data();
            
            // Get sender's public key
            const senderRef = doc(db, 'users', keyExchange.senderId);
            const senderSnap = await getDoc(senderRef);
            if (!senderSnap.exists()) {
              console.log(`[KEY_EXCHANGE] Sender ${keyExchange.senderId} not found, skipping`);
              continue;
            }
            
            const senderPublicKey = senderSnap.data().publicKey;
            if (!senderPublicKey) {
              console.log(`[KEY_EXCHANGE] Sender ${keyExchange.senderId} has no public key, skipping`);
              continue;
            }
            
            console.log(`[KEY_EXCHANGE] Processing key from ${keyExchange.senderId} for groop ${groopId}`);
            
            // Decrypt and store the groop key
            const success = await EncryptionService.receiveGroopKey(
              keyExchange.encryptedKey,
              senderPublicKey,
              userKeys.secretKey,
              groopId
            );
            
            if (success) {
              processedKeys++;
              console.log(`[KEY_EXCHANGE] Successfully received key for groop ${groopId}`);
              
              // Update key exchange status or delete it
              await updateDoc(keyExchangeDoc.ref, {
                status: 'completed',
                processedAt: serverTimestamp()
              });
              
              // Optionally delete the key exchange after processing
              // await deleteDoc(keyExchangeDoc.ref);
            } else {
              console.error(`[KEY_EXCHANGE] Failed to process key for groop ${groopId}`);
              await updateDoc(keyExchangeDoc.ref, {
                status: 'failed',
                processedAt: serverTimestamp()
              });
            }
          }
        
        }
        
        console.log(`[KEY_EXCHANGE] Completed processing. Successfully processed ${processedKeys} keys.`);
      } catch (error) {
        console.error('[KEY_EXCHANGE] Error processing key exchanges:', error);
      }
    }

    /**
     * Handle new user joining a group by triggering key sharing
     * This should be called when a new user joins a group
     */
    static async handleNewMemberJoined(groopId: string, newMemberId: string, existingMemberIds: string[]): Promise<boolean> {
      try {
        if (!groopId || !newMemberId || !Array.isArray(existingMemberIds)) {
          console.error('[KEY_EXCHANGE] Invalid parameters');
          return false;
        }
        
        // Find a member who already has the key to share it
        for (const memberId of existingMemberIds) {
          // Skip if it's the new member
          if (memberId === newMemberId) continue;
          
          // Check if this member has keys
          const memberKeys = await EncryptionService.getUserKeys(memberId);
          if (!memberKeys) continue;
          
          // Try to share the key using this member
          const success = await this.shareGroopKeyWithMember(groopId, newMemberId, memberId);
          if (success) {
            console.log(`[KEY_EXCHANGE] Successfully initiated key exchange from ${memberId} to ${newMemberId}`);
            return true;
          }
        }
        
        console.error('[KEY_EXCHANGE] Failed to find a member who can share the key');
        return false;
      } catch (error) {
        console.error('[KEY_EXCHANGE] Error handling new member:', error);
        return false;
      }
    }
    
    /**
     * Rotate the group encryption key periodically for better security
     * This implements Perfect Forward Secrecy
     */
    static async rotateGroopKey(groopId: string, initiatorId: string): Promise<boolean> {
      try {
        if (!EncryptionService.checkPRNG()) {
          console.error('[KEY_EXCHANGE] PRNG not available for key rotation');
          return false;
        }
        
        // Generate a new key
        const newKey = await EncryptionService.generateGroopKey(groopId);
        
        // Get all group members
        const groopRef = doc(db, 'groops', groopId);
        const groopSnap = await getDoc(groopRef);
        
        if (!groopSnap.exists()) {
          console.error('[KEY_EXCHANGE] Group not found');
          return false;
        }
        
        if (!groopSnap.data()?.encryptionEnabled) {
          // Set up encryption for this group before rotating keys
          await this.setupGroopEncryption(groopId, initiatorId);
          console.log('[KEY_EXCHANGE] Encryption initialized for group:', groopId);
        }
        
        const members = groopSnap.data().members || [];
        
        // Update group metadata
        await updateDoc(groopRef, {
          keyRotatedAt: serverTimestamp(),
          keyRotatedBy: initiatorId
        });
        
        // Share the new key with all members except initiator (who already has it)
        const initiatorKeys = await EncryptionService.getUserKeys(initiatorId);
        if (!initiatorKeys) {
          console.error('[KEY_EXCHANGE] Initiator keys not found');
          return false;
        }

            // Create an array of promises for sharing keys with all members (except initiator)
            const keySharePromises = members
            .filter((memberId: string) => memberId !== initiatorId)
            .map((memberId: string) => this.shareGroopKeyWithMember(groopId, memberId, initiatorId));
        
         // Wait for all key sharing operations to complete
        const results = await Promise.all(keySharePromises);
        const allSucceeded = results.every(result => result === true);

        if (!allSucceeded) {
          console.warn('[KEY_EXCHANGE] Some key sharing operations failed');
        return false;
        } else {
          console.log('[KEY_EXCHANGE] Successfully rotated group key for all members');
        return true;
        }   
      } catch (error) {
        console.error('[KEY_EXCHANGE] Error rotating group key:', error);
        return false;
      }
    }
  }