import logger from '../utils/logger';
import * as FileSystem from 'react-native-fs';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Platform } from 'react-native';

class ImageUploadService {
  /**
   * Uploads an image to Firebase Storage
   * @param uri - Local URI of the image
   * @param path - Storage path where the image should be stored
   * @returns Promise with download URL of the uploaded image
   */
  static async uploadImage(uri: string, path: string): Promise<string> {
    try {
      logger.chat(`Preparing to upload image from ${uri}`);
      
      // Get the storage reference
      const storage = getStorage();
      const storageRef = ref(storage, path);
      
      // Get the blob from local URI
      const blob = await this.uriToBlob(uri);
      
      // Start upload
      logger.chat(`Starting upload for ${path}`);
      const uploadTask = await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      logger.chat(`Image uploaded successfully: ${downloadURL}`);
      
      return downloadURL;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  }
  
  /**
   * Convert a local URI to a blob for upload
   * @param uri - Local URI of the image
   * @returns Promise with blob
   */
  private static async uriToBlob(uri: string): Promise<Blob> {
    // Different handling for different platforms
    if (Platform.OS === 'web') {
      // Web version - use fetch to get blob
      const response = await fetch(uri);
      return await response.blob();
    } else {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Create onload handler
        xhr.onload = function() {
          resolve(xhr.response);
        };
        
        // Create error handler
        xhr.onerror = function(e) {
          reject(new Error('uriToBlob failed'));
        };
        
        // Set up response type and fetch
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });
    }
  }
  
  /**
   * Compresses an image before upload
   * This is a placeholder - in a real app, you would use something like
   * react-native-image-resizer to compress the image
   */
  static async compressImage(uri: string, quality = 0.8): Promise<string> {
    // This is a placeholder
    // In a real app, you would compress the image
    return uri;
  }
  
  /**
   * Generates a unique path for the image in storage
   * @param groopId - ID of the group
   * @param userId - ID of the user
   * @returns Storage path for the image
   */
  static generateImagePath(groopId: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    return `groops/${groopId}/images/${userId}_${timestamp}_${randomString}.jpg`;
  }
}

export default ImageUploadService;