import {
  Check,
  Download,
  EyeOff,
  Infinity as InfinityIcon,
  MessageSquareWarning,
  Monitor,
  Radio,
  ShieldCheck,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StreamSafeGallery from "../components/StreamSafeGallery";
import { streamSafe } from "../data/products";
import { getSoftwareProduct } from "../services/storeApi";

export default function StreamSafePage() {
  const navigate = useNavigate();
  const [product, setProduct] = useState(streamSafe);

  useEffect(() => {
    let active = true;

    getSoftwareProduct("streamsafe")
      .then((loaded) => {
        if (active) setProduct(loaded);
      })
      .catch((error) => {
        console.warn("Using bundled StreamSafe catalog fallback:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  function buyStreamSafe() {
    navigate(`/checkout/${encodeURIComponent(product.slug)}`);
  }

  return (
    <main className="store-shell product-page streamsafe-product-page">
      <div className="breadcrumbs">
        Store <span>/</span> StreamSafe
      </div>

      {/* ======================================================
          HEADER 001
          Product introduction
          ====================================================== */}
      <section className="product-hero-grid streamsafe-hero-grid">
        <div className="product-detail-copy">
          <div className="product-title-with-icon">
            <img src={product.icon} alt="" />
            <div>
              <span className="eyebrow dark">FOR TWITCH STREAMERS</span>
              <h1>StreamSafe</h1>
              <p>{product.tagline}</p>
            </div>
          </div>

          <h2 className="streamsafe-simple-heading">
            Give yourself a few seconds to take something back.
          </h2>

          <p className="product-lead streamsafe-lead">
            When you are live, there is normally no undo button. If your desktop
            shows something private, the wrong scene appears, a notification
            pops up, or something happens that should not go to Twitch, your
            viewers can see it immediately.
          </p>

          <p className="product-lead streamsafe-lead secondary">
            StreamSafe puts a short safety buffer between OBS and Twitch. Your
            stream keeps moving through StreamSafe first. If something goes
            wrong, hit <strong>DUMP</strong> and the selected part of that buffer
            is removed before Twitch receives it.
          </p>

          <div className="streamsafe-plain-callout">
            <ShieldCheck size={22} />
            <div>
              <strong>Think of it like broadcast insurance.</strong>
              <span>
                You hope you never need the button. When you do, you want it
                sitting right there.
              </span>
            </div>
          </div>

          <ul className="feature-list streamsafe-feature-list">
            {product.features.map(feature => (
              <li key={feature}>
                <Check size={17} />
                {feature}
              </li>
            ))}
          </ul>

          <div className="purchase-box">
            <div>
              <strong>{product.price}</strong>
              <span>Pay once. No monthly subscription.</span>
            </div>

            <button
              className="button primary purchase-button"
              onClick={buyStreamSafe}
            >
              Buy StreamSafe
            </button>
          </div>

          <div className="license-note">
            <InfinityIcon size={18} />
            <div>
              <strong>Buy once. Keep it.</strong>
              <span>
                Your StreamSafe license includes future StreamSafe updates.
              </span>
            </div>
          </div>
        </div>

        <div className="product-preview-column streamsafe-preview-column">
          <StreamSafeGallery />

          <div className="requirements-card">
            <h3>What you need</h3>
            <div className="requirement-row">
              <Monitor size={18} />
              <div>
                <strong>A Windows streaming PC</strong>
                <span>Windows 10 or Windows 11, 64-bit.</span>
              </div>
            </div>
            <div className="requirement-row">
              <Radio size={18} />
              <div>
                <strong>OBS + Twitch</strong>
                <span>StreamSafe sits between OBS and your Twitch broadcast.</span>
              </div>
            </div>
            <div className="requirement-row">
              <Download size={18} />
              <div>
                <strong>One installer</strong>
                <span>Download the EXE, install it, activate it, and stream.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          HEADER 002
          Real-world streamer examples
          ====================================================== */}
      <section className="streamsafe-explainer-section">
        <div className="streamsafe-section-heading">
          <span className="eyebrow dark">WHY WOULD I NEED THIS?</span>
          <h2>Because live streams have no edit button.</h2>
          <p>
            StreamSafe is for the little moments that become very big problems
            once hundreds of people have already seen them.
          </p>
        </div>

        <div className="streamsafe-scenario-grid">
          <article>
            <EyeOff size={23} />
            <strong>You show something private</strong>
            <p>
              A DM, email, address, password screen, browser tab, or private
              window appears on stream by mistake.
            </p>
          </article>

          <article>
            <MessageSquareWarning size={23} />
            <strong>The wrong thing appears on screen</strong>
            <p>
              A bad scene switch, unexpected notification, guest content, or
              something you simply do not want broadcast pops up.
            </p>
          </article>

          <article>
            <VolumeX size={23} />
            <strong>You need to take back a few seconds</strong>
            <p>
              Instead of hoping nobody clipped it, hit DUMP while the moment is
              still inside StreamSafe's safety buffer.
            </p>
          </article>
        </div>
      </section>

      {/* ======================================================
          HEADER 003
          Simple three-step explanation
          ====================================================== */}
      <section className="streamsafe-how-section">
        <div className="streamsafe-section-heading">
          <span className="eyebrow dark">HOW IT WORKS</span>
          <h2>OBS → StreamSafe → Twitch.</h2>
          <p>No broadcast-engineering degree required.</p>
        </div>

        <div className="streamsafe-step-grid">
          <article>
            <span>1</span>
            <div>
              <strong>Pick your safety window</strong>
              <p>
                Choose how many seconds you want StreamSafe to hold before your
                broadcast reaches Twitch.
              </p>
            </div>
          </article>

          <article>
            <span>2</span>
            <div>
              <strong>Stream normally from OBS</strong>
              <p>
                You keep using OBS. StreamSafe handles the protected path to
                Twitch in the background.
              </p>
            </div>
          </article>

          <article>
            <span>3</span>
            <div>
              <strong>Hit DUMP if something goes wrong</strong>
              <p>
                StreamSafe removes the selected buffered moment instead of
                sending that part to Twitch.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
