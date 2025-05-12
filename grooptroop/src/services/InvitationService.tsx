import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GroopService } from './GroopService';

export class InvitationService {
  /**
   * Validate an invitation link and return groop details
   * @param groopId The ID of the groop from the invitation link
   */
  static async validateInvitation(groopId: string) {
    try {
      console.log('[INVITATION] Validating invitation for groop:', groopId);
      
      // Check if the groop exists
      const groopRef = doc(db, 'groops', groopId);
      const groopSnap = await getDoc(groopRef);
      
      if (!groopSnap.exists()) {
        console.log('[INVITATION] Groop not found, invalid invitation');
        return { valid: false, message: 'This invitation is no longer valid.' };
      }
      
      const groopData = groopSnap.data();
      console.log('[INVITATION] Found groop:', groopData.name);
      
      return { 
        valid: true, 
        groopName: groopData.name,
        groopId: groopId,
        groopPhoto: groopData.photoURL || null,
        createdBy: groopData.createdBy || null,
        memberCount: (groopData.members || []).length
      };
    } catch (error) {
      console.error('[INVITATION] Error validating invitation:', error);
      return { valid: false, message: 'Failed to validate invitation. Please try again.' };
    }
  }
  
  /**
   * Accept an invitation and join the groop
   * @param groopId The ID of the groop to join
   * @param userId The ID of the user accepting the invitation
   */
  static async acceptInvitation(groopId: string, userId: string) {
    try {
      console.log(`[INVITATION] User ${userId} accepting invitation for groop ${groopId}`);
      
      // Check if the user is already a member
      const isMember = await GroopService.isMember(groopId, userId);
      
      if (isMember) {
        console.log('[INVITATION] User is already a member of this groop');
        return { 
          success: true, 
          message: 'You are already a member of this groop.',
          alreadyMember: true
        };
      }
      
      // Add user to groop
      await GroopService.addMember(groopId, userId);
      
      // Record the invitation acceptance
      await addDoc(collection(db, 'invitationAcceptances'), {
        groopId,
        userId,
        acceptedAt: serverTimestamp()
      });
      
      console.log('[INVITATION] Successfully joined groop');
      
      return { 
        success: true, 
        message: 'You have successfully joined the groop!',
        alreadyMember: false
      };
    } catch (error) {
      console.error('[INVITATION] Error accepting invitation:', error);
      return { 
        success: false, 
        message: 'Failed to join the groop. Please try again.',
        alreadyMember: false
      };
    }
  }
  
  /**
   * Track invitation link generation for analytics
   * @param groopId The ID of the groop
   * @param generatedBy The ID of the user who generated the invitation
   */
  static async trackInvitationGenerated(groopId: string, generatedBy: string) {
    try {
      await addDoc(collection(db, 'invitationLinks'), {
        groopId,
        generatedBy,
        generatedAt: serverTimestamp(),
        clicks: 0
      });
      
      console.log('[INVITATION] Tracked invitation generation');
      return true;
    } catch (error) {
      console.error('[INVITATION] Error tracking invitation generation:', error);
      return false;
    }
  }
  
  /**
   * Generate a short code for an invitation link
   * Makes URLs shorter and more shareable for social media
   */
  static async generateInviteCode(groopId: string, userId: string): Promise<string> {
    try {
      // Create a new document with auto-generated ID
      const inviteRef = await addDoc(collection(db, 'invitationLinks'), {
        groopId,
        generatedBy: userId,
        generatedAt: serverTimestamp(),
        clicks: 0
      });
      
      // Take the first 8 characters of the document ID as a short code
      const shortCode = inviteRef.id.substring(0, 8);
      
      // Update the document with the short code for reference
      await updateDoc(inviteRef, { shortCode });
      
      console.log('[INVITATION] Generated short code:', shortCode);
      return shortCode;
    } catch (error) {
      console.error('[INVITATION] Error generating short code:', error);
      throw error;
    }
  }
  
  /**
   * Track when an invitation link is clicked
   * @param invitationId The ID of the invitation document
   */
  static async trackInvitationClicked(invitationId: string) {
    try {
      const invitationRef = doc(db, 'invitationLinks', invitationId);
      await updateDoc(invitationRef, {
        clicks: arrayUnion(serverTimestamp())
      });
      
      console.log('[INVITATION] Tracked invitation click');
      return true;
    } catch (error) {
      console.error('[INVITATION] Error tracking invitation click:', error);
      return false;
    }
  }
}