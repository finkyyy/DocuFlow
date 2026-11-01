"use client";

import { useEffect, useState, type ReactNode } from "react";
import ConvertCard from "@/components/ConvertCard";
import ToolCard from "@/components/ToolCard";

type ToolId = "gabung" | "kompres" | "bagikan" | "konversi";
type ViewId = "beranda" | ToolId;

type Tool = {
  id: ToolId;
  label: string;
  description: string;
  icon: ReactNode;
};

type NavItem = {
  id: ViewId;
  label: string;
  icon: ReactNode;
};

const TOOLS: Tool[] = [
  {
    id: "gabung",
    label: "Gabung PDF",
    description: "Satukan beberapa PDF jadi satu dokumen, urutannya bisa diatur.",
    icon: (
      <>
        <rect x="7" y="3" width="11" height="14" rx="2" />
        <path d="M4 7v12a2 2 0 0 0 2 2h8" />
      </>
    ),
  },
  {
    id: "kompres",
    label: "Kompres PDF",
    description: "Perkecil ukuran PDF supaya mudah dikirim.",
    icon: (
      <>
        <path d="M4 9h5V4" />
        <path d="M20 15h-5v5" />
        <path d="m9 9-5-5" />
        <path d="m15 15 5 5" />
      </>
    ),
  },
  {
    id: "bagikan",
    label: "Bagikan lewat link",
    description: "Unggah file dan dapatkan link unduhan sementara.",
    icon: (
      <>
        <path d="M10 13a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
        <path d="M14 11a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
      </>
    ),
  },
  {
    id: "konversi",
    label: "Konversi",
    description: "Ubah Word ke PDF atau PDF ke Word.",
    icon: (
      <>
        <path d="M4 7h14" />
        <path d="m15 4 3 3-3 3" />
        <path d="M20 17H6" />
        <path d="m9 14-3 3 3 3" />
      </>
    ),
  },
];

const HOME_ICON = (
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
    <path d="M10 21v-6h4v6" />
  </>
);

const NAV_ITEMS: NavItem[] = [
  { id: "beranda", label: "Beranda", icon: HOME_ICON },
  ...TOOLS.map(({ id, label, icon }) => ({ id, label, icon })),
];

const DEFAULT_VIEW: ViewId = "beranda";

function viewFromHash(hash: string): ViewId | null {
  const id = hash.replace(/^#/, "").toLowerCase();
  if (id === "beranda") return "beranda";
  return TOOLS.find((tool) => tool.id === id)?.id ?? null;
}

function ToolIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function HomePanel({ onOpen }: { onOpen: (id: ToolId) => void }) {
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 className="home-title" id="home-title">
        Selamat datang di DocuFlow
      </h1>
      <p className="home-lead">
        Tempat praktis untuk mengolah dokumen. Gabungkan, kompres, bagikan, dan konversi file PDF
        dan Word langsung dari browser, tanpa instal aplikasi apa pun.
      </p>

      <div className="feature-grid">
        {TOOLS.map((tool) => (
          <a
            key={tool.id}
            className="feature-card"
            href={`#${tool.id}`}
            onClick={() => onOpen(tool.id)}
          >
            <span className="feature-icon">
              <ToolIcon>{tool.icon}</ToolIcon>
            </span>
            <span className="feature-title">{tool.label}</span>
            <span className="feature-text">{tool.description}</span>
          </a>
        ))}
      </div>

      <p className="home-note">
        Gabung dan kompres diproses langsung tanpa disimpan. Link berbagi kedaluwarsa setelah 24
        jam. Konversi Word dan PDF diproses lewat layanan pihak ketiga.
      </p>
    </section>
  );
}

export default function Workbench() {
  const [active, setActive] = useState<ViewId>(DEFAULT_VIEW);

  useEffect(() => {
    function syncFromHash() {
      const fromHash = viewFromHash(window.location.hash);
      if (fromHash) {
        setActive(fromHash);
        return;
      }
      setActive(DEFAULT_VIEW);
      window.history.replaceState(null, "", `#${DEFAULT_VIEW}`);
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <a className="brand" href="#beranda" onClick={() => setActive("beranda")}>
            DocuFlow
          </a>

          <nav className="tool-nav" aria-label="Alat dokumen">
            <ul className="nav-list">
              {NAV_ITEMS.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      className={isActive ? "nav-link active" : "nav-link"}
                      href={`#${item.id}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setActive(item.id)}
                    >
                      <span className="nav-icon">
                        <ToolIcon>{item.icon}</ToolIcon>
                      </span>
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="sidebar-note">
            Gabung dan kompres diproses langsung dan tidak disimpan. Link berbagi kedaluwarsa
            setelah 24 jam.
          </p>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace-inner">
          <div hidden={active !== "beranda"}>
            <HomePanel onOpen={(id) => setActive(id)} />
          </div>

          <div className="tool-panel" hidden={active !== "gabung"}>
            <ToolCard
              title="Gabungkan PDF"
              endpoint="/api/pdf/merge"
              fieldName="files"
              multiple
              button="Gabungkan"
              mode="download"
            />
          </div>

          <div className="tool-panel" hidden={active !== "kompres"}>
            <ToolCard
              title="Kompres PDF"
              endpoint="/api/pdf/compress"
              fieldName="file"
              button="Kompres"
              mode="download"
            />
          </div>

          <div className="tool-panel" hidden={active !== "bagikan"}>
            <ToolCard
              title="Bagikan lewat link"
              endpoint="/api/share"
              fieldName="file"
              button="Buat link"
              mode="link"
            />
          </div>

          <div className="tool-panel" hidden={active !== "konversi"}>
            <ConvertCard />
          </div>

          {active !== "beranda" && (
            <p className="limits">Maksimal 4 MB per file (total 4 MB untuk Gabung)</p>
          )}
        </div>
      </main>
    </div>
  );
}
