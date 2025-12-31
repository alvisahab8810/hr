import { getSession } from "next-auth/react";

export async function getServerSideProps(ctx) {
  /* --------- 1. NextAuth session (salesperson or admin) ---------- */
  const session = await getSession(ctx);
  if (session) {
    const dest =
      session.user.role === "admin"
        ? "/dashboard/admin"
        : "/dashboard/salesperson";
    return { redirect: { destination: dest, permanent: false } };
  }

  /* --------- 2. Legacy admin cookie ------------------------------ */
  const cookie = ctx.req.headers.cookie || "";
  if (cookie.includes("admin_auth=verified")) {
    return { redirect: { destination: "/dashboard/admin", permanent: false } };
  }

  /* --------- 3. Not logged in ------------------------------------ */
  return { redirect: { destination: "/login", permanent: false } };
}

export default function DashboardRedirect() {
  // Will never render because of redirect logic above
  return null;
}
