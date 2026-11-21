import 'dotenv/config';
import ImageKit from 'imagekit';

// 1. Validate environment configuration
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();

if (!publicKey || !privateKey || !urlEndpoint) {
  console.warn(
    'WARNING: ImageKit credentials missing in .env (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT).'
  );
}

// 2. Initialize ImageKit instance
export const imagekit = new ImageKit({
  publicKey: publicKey || '',
  privateKey: privateKey || '',
  urlEndpoint: urlEndpoint || '',
});

// 3. Normalized response interface
export interface UploadedCloudFile {
  fileId: string;
  url: string;
  name: string;
  size: number;
  filePath: string;
}

/**
 * Upload a file buffer directly to ImageKit.
 *
 * @param buffer - File content buffer (from multer memoryStorage)
 * @param fileName - Original or sanitized file name
 * @param folder - Target folder path in ImageKit (e.g. '/chat', '/tasks')
 */
export async function uploadToImageKit(
  buffer: Buffer,
  fileName: string,
  folder: string = '/chat'
): Promise<UploadedCloudFile> {
  try {
    const response = await imagekit.upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: true, // Prevents overwriting files with the same name
    });

    return {
      fileId: response.fileId,
      url: response.url,
      name: response.name,
      size: response.size,
      filePath: response.filePath,
    };
  } catch (error: any) {
    console.error('ImageKit upload error:', error);
    throw new Error(error?.message || 'Failed to upload file to ImageKit');
  }
}

/**
 * Delete a single file from ImageKit by its fileId.
 *
 * @param fileId - ImageKit unique fileId
 */
export async function deleteFromImageKit(fileId: string): Promise<void> {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error: any) {
    console.error(`Failed to delete file (${fileId}) from ImageKit:`, error);
    // Don't throw if file was already deleted
  }
}

/**
 * Bulk delete multiple files from ImageKit by their fileIds.
 *
 * @param fileIds - Array of ImageKit fileIds
 */
export async function bulkDeleteFromImageKit(fileIds: string[]): Promise<void> {
  if (!fileIds || fileIds.length === 0) return;
  try {
    await imagekit.bulkDeleteFiles(fileIds);
  } catch (error: any) {
    console.error('Failed to bulk delete files from ImageKit:', error);
  }
}

export default imagekit;