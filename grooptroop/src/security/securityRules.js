rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Basic functions for rule reuse
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection rules
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isOwner(userId);
    }
    
    // Invitations collection
    match /invitationLinks/{linkId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && resource.data.recipientId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && resource.data.recipientId == request.auth.uid;
    }
    
    // Groops collection rules
    match /groops/{groopId} {
      // Allow reading a list of groops
      allow list: if isAuthenticated();
      
      // Allow reading a specific groop if you're a member
      allow get: if isAuthenticated() && 
                 resource.data.members.hasAny([request.auth.uid]);
      
      // Anyone authenticated can create a groop
      allow create: if isAuthenticated();
      
      // Only organizers/admins can update or delete
      allow update, delete: if isAuthenticated() && 
        ((resource.data.organizerID != null && resource.data.organizerID.hasAny([request.auth.uid])) ||
         (resource.data.admins != null && resource.data.admins.hasAny([request.auth.uid])));
      
      // Subcollection rules
      match /accommodation/{docId} {
        allow read, write: if isAuthenticated() && 
                          get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
      }
      
      match /messages/{messageId} {
        allow read, write: if isAuthenticated() && 
                          get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
      }
      
      match /payments/{paymentId} {
        allow read, write: if isAuthenticated() && 
                          get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
      }
      
      match /payment_summaries/{summaryId} {
        allow read, write: if isAuthenticated() && 
                          get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
      }
      
      match /itinerary/{dayId} {
        allow read, write: if isAuthenticated() && 
                          get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
        
        match /events/{eventId} {
          allow read, write: if isAuthenticated() && 
                            get(/databases/$(database)/documents/groops/$(groopId)).data.members.hasAny([request.auth.uid]);
        }
      }
      
      match /keyExchanges/{exchangeId} {
        allow read: if isAuthenticated() && 
                   (resource.data.recipientId == request.auth.uid || 
                    resource.data.senderId == request.auth.uid);
        allow create: if isAuthenticated() && 
                    request.resource.data.senderId == request.auth.uid;
        allow update: if isAuthenticated() &&
                    request.resource.data.recipientId == request.auth.uid &&
                    resource.data.recipientId == request.auth.uid;
        allow delete: if isAuthenticated() && 
                    (resource.data.recipientId == request.auth.uid || 
                     resource.data.senderId == request.auth.uid);
      }
    }
    
    // Chats collection rules
    match /chats/{chatId} {
      allow read: if isAuthenticated() &&
                 resource.data.participants.hasAny([request.auth.uid]);
      allow create: if isAuthenticated() && 
                  request.resource.data.participants.hasAny([request.auth.uid]);
      allow update: if isAuthenticated() && 
                  resource.data.participants.hasAny([request.auth.uid]);
      allow delete: if false;
    }
    
    // Top-level messages collection
    match /messages/{messageId} {
      allow read: if isAuthenticated() && 
                 resource.data.chatId != null &&
                 exists(/databases/$(database)/documents/chats/$(resource.data.chatId)) &&
                 get(/databases/$(database)/documents/chats/$(resource.data.chatId)).data.participants.hasAny([request.auth.uid]);
      allow create: if isAuthenticated() && 
                  request.resource.data.senderId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
                         resource.data.senderId == request.auth.uid;
    }
    
    // Allow access to test collection during development
    match /test/{docId} {
      allow read, write: if isAuthenticated();
    }
    
    // Prevent all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}