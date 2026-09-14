/* ==========================================================
   HEADER 001
   MARKETPLACE IMAGE STANDARDS

   Product images are validated and regenerated in the browser
   before upload. High-resolution source files are reduced to a
   web-friendly WebP while undersized images are rejected.
   ========================================================== */

export const MAX_LISTING_IMAGES = 8;
export const MIN_IMAGE_SHORT_SIDE = 900;
export const MIN_IMAGE_LONG_SIDE = 1200;
export const MAX_IMAGE_DIMENSION = 1600;
export const MAX_SOURCE_IMAGE_BYTES = 30 * 1024 * 1024;
export const WEBP_QUALITY = 0.88;

export type PreparedListingImage = {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

export type ListingImageItem = {
  id: string;
  name: string;
  previewUrl: string;
  file?: File;
  existingUrl?: string;
  width?: number;
  height?: number;
};

/* ==========================================================
   HEADER 002
   IMAGE DECODE
   ========================================================== */

async function decodeImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`${file.name} could not be read as an image.`));
    image.src = sourceUrl;
  });

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(sourceUrl),
  };
}

/* ==========================================================
   HEADER 003
   WEBP REGENERATION
   ========================================================== */

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error("The browser could not optimize this image."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

function optimizedDimensions(width: number, height: number) {
  const largest = Math.max(width, height);
  if (largest <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const ratio = MAX_IMAGE_DIMENSION / largest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function safeBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return (
    withoutExtension
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product-photo"
  );
}

/* ==========================================================
   HEADER 004
   PREPARE ONE IMAGE
   ========================================================== */

export async function prepareListingImage(file: File): Promise<PreparedListingImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(`${file.name} is larger than 30 MB. Please choose a smaller source image.`);
  }

  const decoded = await decodeImage(file);

  try {
    const shortSide = Math.min(decoded.width, decoded.height);
    const longSide = Math.max(decoded.width, decoded.height);

    if (shortSide < MIN_IMAGE_SHORT_SIDE || longSide < MIN_IMAGE_LONG_SIDE) {
      throw new Error(
        `${file.name} is ${decoded.width}×${decoded.height}. ` +
          `Product photos must be at least ${MIN_IMAGE_LONG_SIDE}×${MIN_IMAGE_SHORT_SIDE} ` +
          `(or ${MIN_IMAGE_SHORT_SIDE}×${MIN_IMAGE_LONG_SIDE}) so they remain sharp in the Store.`,
      );
    }

    const size = optimizedDimensions(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("The browser could not prepare this image for upload.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(decoded.source, 0, 0, size.width, size.height);

    const blob = await canvasToWebp(canvas);
    const optimizedName = `${safeBaseName(file.name)}.webp`;
    const optimizedFile = new File([blob], optimizedName, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return {
      id: crypto.randomUUID(),
      name: optimizedName,
      file: optimizedFile,
      previewUrl: URL.createObjectURL(optimizedFile),
      width: size.width,
      height: size.height,
    };
  } finally {
    decoded.cleanup();
  }
}

/* ==========================================================
   HEADER 005
   PREPARE MULTIPLE IMAGES
   ========================================================== */

export async function prepareListingImages(
  files: File[],
  remainingSlots: number,
): Promise<PreparedListingImage[]> {
  const selected = files.slice(0, Math.max(0, remainingSlots));
  const prepared: PreparedListingImage[] = [];

  try {
    for (const file of selected) {
      prepared.push(await prepareListingImage(file));
    }
    return prepared;
  } catch (error) {
    prepared.forEach(image => URL.revokeObjectURL(image.previewUrl));
    throw error;
  }
}

export function disposeListingImage(item: ListingImageItem) {
  if (item.file && item.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
