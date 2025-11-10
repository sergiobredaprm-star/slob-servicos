'use client';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
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
  // Use a timestamp to ensure unique file names and prevent overwriting
  const fileName = `${new Date().getTime()}-${file.name}`;
  const storageRef = ref(storage, `profile-images/${userId}/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new Error("Não foi possível fazer o upload da imagem.");
  }
}

/**
 * Lists all profile images for a given user from Firebase Storage.
 * @param firebaseApp The Firebase app instance.
 * @param userId The ID of the user.
 * @returns A promise that resolves with an array of image download URLs.
 */
export async function listProfileImages(
  firebaseApp: FirebaseApp,
  userId: string
): Promise<string[]> {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const storage = getStorage(firebaseApp);
  const userImagesRef = ref(storage, `profile-images/${userId}`);

  try {
    const res = await listAll(userImagesRef);
    const urls = await Promise.all(
      res.items.map((itemRef) => getDownloadURL(itemRef))
    );
    // Sort urls to show the most recent ones first
    return urls.reverse();
  } catch (error) {
    console.error("Error listing profile images:", error);
    // Don't throw an error, just return an empty array if listing fails
    return [];
  }
}