import {
  BookOpen,
  CircleHelp,
  KeyRound,
  Mail,
  Wrench,
} from "lucide-react";

const guideUrl =
  import.meta.env.VITE_STREAMSAFE_GUIDE_URL?.trim() ||
  "https://otles.onetimelabs.net";

const supportItems = [
  {
    icon: BookOpen,
    title: "Installation Guide",
    description: "Install StreamSafe and configure OBS.",
    href: guideUrl,
  },
  {
    icon: KeyRound,
    title: "Activation Help",
    description: "Activate a perpetual StreamSafe license.",
    href: guideUrl,
  },
  {
    icon: CircleHelp,
    title: "Using StreamSafe",
    description: "Recall windows, Float, DUMP, and Test Mode.",
    href: guideUrl,
  },
  {
    icon: Wrench,
    title: "Troubleshooting",
    description: "Common installation and streaming issues.",
    href: guideUrl,
  },
  {
    icon: Mail,
    title: "Contact OneTime Labs",
    description: "Get help directly from OneTime Labs.",
    href: "mailto:inquiry@onetimelabs.net",
  },
];

export default function SupportPage() {
  return (
    <main className="store-shell support-page">
      <div className="support-heading">
        <span className="eyebrow dark">SUPPORT</span>
        <h1>Need help?</h1>
        <p>
          Installation, activation, and StreamSafe documentation.
        </p>
      </div>

      <div className="support-list">
        {supportItems.map(item => {
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              className="support-row"
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <span className="support-icon">
                <Icon size={19} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span className="support-arrow">›</span>
            </a>
          );
        })}
      </div>
    </main>
  );
}
