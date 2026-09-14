import {
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

/* ==========================================================
   HEADER 001
   StreamSafe product gallery data
   Real application screenshots only. Explanations are HTML/CSS
   overlays so the source screenshots are never modified.
   ========================================================== */

type GallerySlide = {
  image: string;
  title: string;
  description: string;
  guideTitle: string;
  guideText: string;
  highlights: string[];
  alt: string;
};

const slides: GallerySlide[] = [
  {
    image: "/images/streamsafe-gallery/live-control.png",
    title: "Live Control",
    description:
      "Operate the relay, choose the protection window, and keep DUMP ready from one screen.",
    guideTitle: "Everything you need while you're live",
    guideText:
      "Start the relay in Test Mode or Go Live, choose how many seconds you want protected, and use DUMP before the protected moment reaches viewers.",
    highlights: [
      "Test / Go Live",
      "Recall window",
      "Emergency DUMP",
    ],
    alt:
      "Real StreamSafe Live Control screen showing relay controls, recall settings, status cards, and the DUMP control.",
  },
  {
    image: "/images/streamsafe-gallery/configuration.png",
    title: "Configuration",
    description:
      "Configure Twitch, OBS input, protection behavior, and the managed runtime.",
    guideTitle: "Set it once. Operate from Live Control.",
    guideText:
      "Save your Twitch credentials, confirm the local OBS connection, and let StreamSafe manage the protection runtime and transport ports automatically.",
    highlights: [
      "Twitch credentials",
      "OBS input",
      "Managed runtime",
    ],
    alt:
      "Real StreamSafe Configuration screen showing Twitch credentials, OBS input, protection rules, and managed runtime status.",
  },
  {
    image: "/images/streamsafe-gallery/status-logs.png",
    title: "Status & Logs",
    description:
      "See OBS, the protection buffer, Twitch, recall timing, and diagnostics in one place.",
    guideTitle: "Know when you're actually protected",
    guideText:
      "Current Status shows the live pipeline state. Recall Timeline shows the protected window, and Diagnostics gives you the engine log when something needs troubleshooting.",
    highlights: [
      "Current status",
      "Recall timeline",
      "Diagnostics",
    ],
    alt:
      "Real StreamSafe Status and Logs screen showing current status, recall timeline, and diagnostics.",
  },
  {
    image: "/images/streamsafe-gallery/floating-emergency-control.png",
    title: "Floating DUMP",
    description:
      "Keep the emergency control visible above OBS, chat, or whatever else is on your desktop.",
    guideTitle: "Keep DUMP within reach",
    guideText:
      "The compact always-on-top control stays over your other windows, so you do not have to hunt for StreamSafe when a live mistake happens.",
    highlights: [
      "Always on top",
      "Move it anywhere",
      "One-click DUMP",
    ],
    alt:
      "Real desktop screenshot showing the StreamSafe floating DUMP control positioned above another application.",
  },
];

/* ==========================================================
   HEADER 002
   StreamSafe product gallery
   ========================================================== */

export default function StreamSafeGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [notesVisible, setNotesVisible] = useState(true);

  const activeSlide = slides[activeIndex];

  function selectSlide(index: number) {
    setActiveIndex(index);
    setNotesVisible(true);
  }

  function showPrevious() {
    setActiveIndex(current =>
      current === 0
        ? slides.length - 1
        : current - 1,
    );
    setNotesVisible(true);
  }

  function showNext() {
    setActiveIndex(current =>
      current === slides.length - 1
        ? 0
        : current + 1,
    );
    setNotesVisible(true);
  }

  /* ========================================================
     HEADER 003
     Expanded viewer keyboard / scroll behavior
     ======================================================== */

  useEffect(() => {
    if (!expanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <section
        className="streamsafe-gallery"
        aria-label="Real StreamSafe application screenshots"
      >
        {/* ====================================================
            HEADER 004
            Real screenshot stage
            ==================================================== */}
        <div className="streamsafe-gallery-stage">
          <button
            className="streamsafe-gallery-image-target"
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`View full screenshot: ${activeSlide.title}`}
          >
            <img
              key={activeSlide.image}
              className="streamsafe-gallery-image"
              src={activeSlide.image}
              alt={activeSlide.alt}
            />
          </button>

          {notesVisible ? (
            <aside className="streamsafe-gallery-note" aria-live="polite">
              <div className="streamsafe-gallery-note-topline">
                <span>
                  <Info size={13} />
                  SCREEN GUIDE
                </span>
                <button
                  type="button"
                  onClick={() => setNotesVisible(false)}
                  aria-label="Hide screenshot guide"
                >
                  Hide
                </button>
              </div>

              <strong>{activeSlide.guideTitle}</strong>
              <p>{activeSlide.guideText}</p>

              <div className="streamsafe-gallery-highlight-list">
                {activeSlide.highlights.map(highlight => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
            </aside>
          ) : (
            <button
              className="streamsafe-gallery-show-note"
              type="button"
              onClick={() => setNotesVisible(true)}
            >
              <Info size={13} />
              Show screen guide
            </button>
          )}

          <button
            className="streamsafe-gallery-expand-control"
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Open ${activeSlide.title} full size`}
          >
            <Maximize2 size={15} />
            Full screenshot
          </button>

          <button
            className="streamsafe-gallery-arrow previous"
            type="button"
            onClick={showPrevious}
            aria-label="Previous StreamSafe screenshot"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            className="streamsafe-gallery-arrow next"
            type="button"
            onClick={showNext}
            aria-label="Next StreamSafe screenshot"
          >
            <ChevronRight size={22} />
          </button>

          <div className="streamsafe-gallery-count">
            {activeIndex + 1} / {slides.length}
          </div>
        </div>

        {/* ====================================================
            HEADER 005
            Screenshot selector
            ==================================================== */}
        <div
          className="streamsafe-gallery-selector"
          role="tablist"
          aria-label="Choose a StreamSafe screenshot"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : ""}
              onClick={() => selectSlide(index)}
            >
              <span className="streamsafe-gallery-thumb">
                <img src={slide.image} alt="" />
              </span>

              <span className="streamsafe-gallery-selector-copy">
                <strong>{slide.title}</strong>
                <small>{slide.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ======================================================
          HEADER 006
          Full-screen clean screenshot lightbox
          ====================================================== */}
      {expanded && (
        <div
          className="streamsafe-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded StreamSafe screenshot: ${activeSlide.title}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setExpanded(false);
            }
          }}
        >
          <div className="streamsafe-lightbox-shell">
            <div className="streamsafe-lightbox-toolbar">
              <div>
                <strong>{activeSlide.title}</strong>
                <span>Real StreamSafe screenshot · {activeIndex + 1} of {slides.length}</span>
              </div>

              <button
                type="button"
                className="streamsafe-lightbox-close"
                onClick={() => setExpanded(false)}
                aria-label="Close expanded image"
              >
                <X size={22} />
              </button>
            </div>

            <div className="streamsafe-lightbox-image-wrap">
              <img
                key={`expanded-${activeSlide.image}`}
                className="streamsafe-lightbox-image"
                src={activeSlide.image}
                alt={activeSlide.alt}
              />

              <button
                className="streamsafe-lightbox-arrow previous"
                type="button"
                onClick={showPrevious}
                aria-label="Previous StreamSafe image"
              >
                <ChevronLeft size={30} />
              </button>

              <button
                className="streamsafe-lightbox-arrow next"
                type="button"
                onClick={showNext}
                aria-label="Next StreamSafe image"
              >
                <ChevronRight size={30} />
              </button>
            </div>

            <div className="streamsafe-lightbox-footer">
              <div>
                <strong>{activeSlide.guideTitle}</strong>
                <p>{activeSlide.guideText}</p>
              </div>

              <div className="streamsafe-lightbox-highlights">
                {activeSlide.highlights.map(highlight => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
