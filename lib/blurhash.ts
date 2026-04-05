import { encode } from "blurhash";

/**
 * 브라우저에서 이미지 File/URL → blurhash 문자열 생성.
 * canvas로 32x32 리사이즈 후 인코딩 (빠르고 충분한 품질).
 */
export async function generateBlurHash(source: File | string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      if (source instanceof File) {
        img.src = URL.createObjectURL(source);
      } else {
        img.src = source;
      }
    });

    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);

    if (source instanceof File) {
      URL.revokeObjectURL(img.src);
    }

    return encode(imageData.data, size, size, 4, 3);
  } catch {
    return null;
  }
}
