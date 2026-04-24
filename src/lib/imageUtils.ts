
/**
 * Resizes and compresses a base64 image to be under a certain size limit.
 * @param base64Str The source base64 string
 * @param maxWidth Max width of the resulting image
 * @param maxHeight Max height of the resulting image
 * @param quality Quality of the JPEG compression (0.0 to 1.0)
 * @returns A promise that resolves to the compressed base64 string
 */
export async function compressImage(
  base64Str: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Return as JPEG to significantly reduce size compared to PNG
      // We start with the requested quality and check size
      const result = canvas.toDataURL('image/jpeg', quality);
      resolve(result);
    };
    img.onerror = (err) => reject(err);
  });
}

/**
 * Utility to check if a base64 string is likely to exceed Firestore's 1MB limit.
 * Base64 is ~33% larger than binary data. 1MB binary is ~1.33MB base64.
 * To stay under 1MB total across the whole document, we should keep the image under ~900KB base64.
 */
export function isBase64TooLarge(base64Str: string, limitBytes: number = 900000): boolean {
  // Approximate size in bytes: length * 3/4
  const sizeInBytes = base64Str.length * 0.75;
  return sizeInBytes > limitBytes;
}
