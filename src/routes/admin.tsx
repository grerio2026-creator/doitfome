import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminNav } from "@/components/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Konsol Admin — DoIt4Me" },
      {
        name: "description",
        content:
          "Konsol internal untuk moderasi sengketa, arus dana escrow, penarikan, dan verifikasi badge institusi.",
      },
      { property: "og:title", content: "Konsol Admin — DoIt4Me" },
      {
        property: "og:description",
        content: "Dashboard peran: super admin, moderasi, keuangan, dan afiliasi.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Konsol Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Setiap aksi diverifikasi ulang di server sesuai peran internal Anda.
      </p>
      <div className="mt-4">
        <AdminNav />
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
