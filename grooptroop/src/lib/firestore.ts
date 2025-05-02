import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function ensureUserDoc(uid: string) {
  await setDoc(
    doc(db, 'users', uid),
    { createdAt: serverTimestamp() },
    { merge: true }
  );
}