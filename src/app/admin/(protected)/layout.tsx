import { Suspense, type ReactNode } from "react";
import { requireActiveAdminUser } from "@/lib/supabase/auth";

async function AuthorizedAdminContent({ children }: { children: ReactNode }) {
  await requireActiveAdminUser();
  return children;
}

function AdminAccessLoading() {
  return (
    <main className="admin-page">
      <p className="admin-loading" role="status">
        Validando acesso...
      </p>
    </main>
  );
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthorizedAdminContent>{children}</AuthorizedAdminContent>
    </Suspense>
  );
}
