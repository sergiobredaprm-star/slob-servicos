import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { firebaseConfig } from '../config';

const adminApps = getApps();

const BUCKET_NAME = `${firebaseConfig.projectId}.appspot.com`;

export function initializeFirebaseAdmin(): App {
  if (adminApps.length > 0) {
    return adminApps[0];
  }

  return initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  });
}
