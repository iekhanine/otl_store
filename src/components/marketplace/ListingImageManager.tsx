import {
  GripVertical,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  MAX_LISTING_IMAGES,
  MIN_IMAGE_LONG_SIDE,
  MIN_IMAGE_SHORT_SIDE,
  disposeListingImage,
  prepareListingImage,
  type ListingImageItem,
  type PreparedListingImage,
} from "../../lib/listingImages";

type Props = {
  images: ListingImageItem[];
  onChange: (images: ListingImageItem[]) => void;
  disabled?: boolean;
};

/* ==========================================================
   HEADER 001
   LISTING IMAGE MANAGER

   Shared image uploader for new + existing listings.
   The first image is always the storefront cover image.
   ========================================================== */

export default function ListingImageManager({
  images,
  onChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_LISTING_IMAGES - images.length);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!selected.length || !remaining) return;

    setProcessing(true);
    setError(null);

    try {
      const prepared: PreparedListingImage[] = [];
      const rejected: string[] = [];

      if (selected.length > remaining) {
        rejected.push(
          `Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added. Listings are limited to ${MAX_LISTING_IMAGES} images.`,
        );
      }

      for (const file of selected.slice(0, remaining)) {
        try {
          prepared.push(await prepareListingImage(file));
        } catch (uploadError) {
          rejected.push(
            uploadError instanceof Error
              ? uploadError.message
              : `${file.name} could not be prepared.`,
          );
        }
      }

      if (prepared.length) {
        onChange([
          ...images,
          ...prepared.map(item => ({
            id: item.id,
            name: item.name,
            previewUrl: item.previewUrl,
            file: item.file,
            width: item.width,
            height: item.height,
          })),
        ]);
      }

      if (rejected.length) {
        setError(rejected.join(" "));
      }
    } finally {
      setProcessing(false);
    }
  }

  function removeImage(id: string) {
    const item = images.find(image => image.id === id);
    if (item) disposeListingImage(item);
    onChange(images.filter(image => image.id !== id));
  }

  function dragStart(event: DragEvent<HTMLDivElement>, id: string) {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function dragOver(event: DragEvent<HTMLDivElement>, overId: string) {
    event.preventDefault();
    const sourceId = draggedId || event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === overId) return;

    const sourceIndex = images.findIndex(image => image.id === sourceId);
    const targetIndex = images.findIndex(image => image.id === overId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...images];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onChange(reordered);
  }

  return (
    <section className="seller-photo-section">
      <div className="seller-photo-heading">
        <div>
          <span className="eyebrow dark">PRODUCT PHOTOS</span>
          <h3>Photos</h3>
          <p>
            Add up to {MAX_LISTING_IMAGES}. Drag photos to change their order.
            The first photo is always the storefront cover image.
          </p>
        </div>
        <span className="seller-photo-count">
          {images.length}/{MAX_LISTING_IMAGES}
        </span>
      </div>

      {images.length > 0 && (
        <div className="seller-photo-grid">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`seller-photo-tile${draggedId === image.id ? " dragging" : ""}`}
              draggable={!disabled}
              onDragStart={event => dragStart(event, image.id)}
              onDragOver={event => dragOver(event, image.id)}
              onDragEnd={() => setDraggedId(null)}
              onDrop={event => event.preventDefault()}
            >
              <img src={image.previewUrl} alt={`Product photo ${index + 1}`} />

              <div className="seller-photo-tile-top">
                <span className="seller-photo-position">{index + 1}</span>
                {index === 0 && (
                  <span className="seller-photo-cover">
                    <Star size={11} /> Cover
                  </span>
                )}
              </div>

              <div className="seller-photo-tile-bottom">
                <span className="seller-photo-drag" title="Drag to reorder">
                  <GripVertical size={14} /> Drag
                </span>
                <button
                  type="button"
                  className="seller-photo-remove"
                  aria-label={`Remove product photo ${index + 1}`}
                  onClick={() => removeImage(image.id)}
                  disabled={disabled}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          className="seller-image-picker seller-image-picker-button"
          disabled={disabled || processing}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={20} />
          <span>
            <strong>{processing ? "Optimizing photos..." : "Add product photos"}</strong>
            <small>
              Minimum {MIN_IMAGE_LONG_SIDE}×{MIN_IMAGE_SHORT_SIDE} (or portrait equivalent).
              High-resolution images are automatically resized and optimized for the Store.
            </small>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        className="seller-photo-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={disabled || processing || remaining === 0}
        onChange={handleFiles}
      />

      {error && <div className="checkout-error seller-photo-error">{error}</div>}
    </section>
  );
}
