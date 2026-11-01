"use client";

import { useEffect, useState, type ReactNode } from "react";
import ConvertCard from "@/components/ConvertCard";
import ToolCard from "@/components/ToolCard";

type ToolId = "gabung" | "kompres" | "bagikan" | "konversi";

type Tool = {
  id: ToolId;
  label: string;
  icon: ReactNode;
};

const TOOLS: Tool[] = [
  {
    id: "gabung",
    label: "Gabung PDF",
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

const DEFAULT_TOOL: ToolId = "gabung";

function toolFromHash(hash: string): ToolId | null {
  const id = hash.replace(/^#/, "").toLowerCase();
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

export default function Workbench() {
  const [active, setActive] = useState<ToolId>(DEFAULT_TOOL);

  useEffect(() => {
    function syncFromHash() {
      const fromHash = toolFromHash(window.location.hash);
      if (fromHash) {
        setActive(fromHash);
        return;
      }
      setActive(DEFAULT_TOOL);
      window.history.replaceState(null, "", `#${DEFAULT_TOOL}`);
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <a className="brand" href="#gabung" onClick={() => setActive("gabung")}>
            DocuFlow
          </a>

          <nav className="tool-nav" aria-label="Alat dokumen">
            <ul className="nav-list">
              {TOOLS.map((tool) => {
                const isActive = active === tool.id;
                return (
                  <li key={tool.id}>
                    <a
                      className={isActive ? "nav-link active" : "nav-link"}
                      href={`#${tool.id}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setActive(tool.id)}
                    >
                      <span className="nav-icon">
                        <ToolIcon>{tool.icon}</ToolIcon>
                      </span>
                      <span>{tool.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="sidebar-note">
            Gabung dan kompres diproses langsung dan tidak disimpan. Link berbagi dihapus otomatis
            setelah 24 jam.
          </p>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace-inner">
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

          <p className="limits">Maksimal 4 MB per file (total 4 MB untuk Gabung)</p>
        </div>
      </main>
    </div>
  );
}
