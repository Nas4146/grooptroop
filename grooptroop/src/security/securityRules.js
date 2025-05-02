rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /groups/{gid} {
      allow read, write: if request.auth != null;
    }
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
      
      // Allow anonymous users to create their own document
      allow create: if request.auth != null && request.auth.uid == uid;
    }
    match /chats/{chatId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                     request.resource.data.participants.hasAny([request.auth.uid]);
    }
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                     request.resource.data.senderId == request.auth.uid;
    }
  }
}