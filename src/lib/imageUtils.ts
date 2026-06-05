
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
  maxWidth: number = 512,
  maxHeight: number = 512,
  quality: number = 0.55
): Promise<string> {
  const MAX_SAFE_SIZE_BYTES = 50 * 1024; // Aim for <= ~50KB per image so multiple views easily fit in 1MB document

  return new Promise((resolve, reject) => {
    // If it's a small placeholder SVG, skip to prevent blank outputs
    if (base64Str.startsWith('data:image/svg+xml') || base64Str.length < 2000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let currentWidth = img.width;
      let currentHeight = img.height;
      let currentQuality = quality;
      let curMaxWidth = maxWidth;
      let curMaxHeight = maxHeight;

      const performCompression = (wLimit: number, hLimit: number, q: number): string => {
        let width = currentWidth;
        let height = currentHeight;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > wLimit) {
            height *= wLimit / width;
            width = wLimit;
          }
        } else {
          if (height > hLimit) {
            width *= hLimit / height;
            height = hLimit;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw solid background to avoid issues with transparency converting to black JPEGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', q);
      };

      try {
        let result = performCompression(curMaxWidth, curMaxHeight, currentQuality);
        let sizeInBytes = result.length * 0.75;
        let iterations = 0;

        // Progressively scale down and compress further if size is still too large
        while (sizeInBytes > MAX_SAFE_SIZE_BYTES && iterations < 5) {
          curMaxWidth = Math.floor(curMaxWidth * 0.8);
          curMaxHeight = Math.floor(curMaxHeight * 0.8);
          currentQuality = Math.max(0.15, currentQuality - 0.1);
          result = performCompression(curMaxWidth, curMaxHeight, currentQuality);
          sizeInBytes = result.length * 0.75;
          iterations++;
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
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
