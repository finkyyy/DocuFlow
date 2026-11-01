import ConvertCard from "@/components/ConvertCard";
import ToolCard from "@/components/ToolCard";

export default function Home() {
  return (
    <main>
      <h1>DocuFlow</h1>
      <p className="lead">Gabung, kompres, konversi, dan bagikan PDF. Maksimal 4 MB per file (total 4 MB untuk Gabungkan PDF).</p>
      <ToolCard title="Gabungkan PDF" endpoint="/api/pdf/merge" fieldName="files" multiple button="Gabungkan" mode="download" />
      <ToolCard title="Kompres PDF" endpoint="/api/pdf/compress" fieldName="file" button="Kompres" mode="download" />
      <ConvertCard />
      <ToolCard title="Bagikan lewat link" endpoint="/api/share" fieldName="file" button="Buat link" mode="link" />
    </main>
  );
}
