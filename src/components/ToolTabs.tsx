"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import ConvertCard from "@/components/ConvertCard";
import ToolCard from "@/components/ToolCard";

const TABS = [
  { id: "merge", label: "Gabung" },
  { id: "compress", label: "Kompres" },
  { id: "share", label: "Bagikan" },
  { id: "convert", label: "Konversi" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ToolTabs() {
  const [active, setActive] = useState<TabId>("merge");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    setActive(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="workbench">
      <div className="tabs" role="tablist" aria-label="Pilih alat">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="panel-merge"
        className="tool-panel"
        role="tabpanel"
        aria-labelledby="tab-merge"
        hidden={active !== "merge"}
      >
        <ToolCard
          title="Gabungkan PDF"
          endpoint="/api/pdf/merge"
          fieldName="files"
          multiple
          button="Gabungkan"
          mode="download"
        />
      </div>

      <div
        id="panel-compress"
        className="tool-panel"
        role="tabpanel"
        aria-labelledby="tab-compress"
        hidden={active !== "compress"}
      >
        <ToolCard
          title="Kompres PDF"
          endpoint="/api/pdf/compress"
          fieldName="file"
          button="Kompres"
          mode="download"
        />
      </div>

      <div
        id="panel-share"
        className="tool-panel"
        role="tabpanel"
        aria-labelledby="tab-share"
        hidden={active !== "share"}
      >
        <ToolCard
          title="Bagikan lewat link"
          endpoint="/api/share"
          fieldName="file"
          button="Buat link"
          mode="link"
        />
      </div>

      <div
        id="panel-convert"
        className="tool-panel"
        role="tabpanel"
        aria-labelledby="tab-convert"
        hidden={active !== "convert"}
      >
        <ConvertCard />
      </div>
    </div>
  );
}
