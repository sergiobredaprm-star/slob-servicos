'use client';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';

/**
 * Uploads a profile image for a user and returns the download URL.
 * @param firebaseApp The Firebase app instance.
 * @param userId The ID of the user.
 * @param file The image file to upload.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfileImage(
  firebaseApp: FirebaseApp,
  userId: string,
  file: File
): Promise<string> {
  if (!userId || !file) {
    throw new Error('User ID and file are required.');
  }

  const storage = getStorage(firebaseApp);
  const storageRef = ref(storage, `profile-images/${userId}/${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new Error("Não foi possível fazer o upload da imagem.");
  }
}
