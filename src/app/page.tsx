import ToolTabs from "@/components/ToolTabs";

export default function Home() {
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-inner">
          <a className="brand" href="/">
            DocuFlow
          </a>
          <p className="masthead-note">Meja kerja dokumen</p>
        </div>
      </header>

      <main className="shell">
        <ToolTabs />
        <div className="page-notes">
          <p className="limits">Maksimal 4 MB per file (total 4 MB untuk Gabung)</p>
          <p className="trust-note">
            Gabung dan kompres diproses langsung dan tidak disimpan. Link berbagi dihapus otomatis
            setelah 24 jam.
          </p>
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>Privasi: DocuFlow hanya menyimpan tautan berbagi, dan menghapusnya saat kedaluwarsa.</p>
          <p className="footer-meta">DocuFlow · alat dokumen</p>
        </div>
      </footer>
    </div>
  );
}
