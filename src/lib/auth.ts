// TODO: ganti dengan implementasi sebenarnya (NextAuth / Supabase Auth / JWT sendiri).
// Untuk sementara semua request dianggap Guest.
export type Viewer = { userId: string | null; isGuest: boolean };

export async function getViewer(_req: Request): Promise<Viewer> {
  return { userId: null, isGuest: true };
}
