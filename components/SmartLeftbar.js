// components/SmartLeftbar.js
// Renders AdminUserLeftbar for invited admin-users, full Leftbar for super-admins.
import { useState, useEffect } from "react";
import Leftbar from "@/components/Leftbar";
import AdminUserLeftbar from "@/components/AdminUserLeftbar";

export default function SmartLeftbar() {
  const [adminUser, setAdminUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.success) setAdminUser(data.user);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (adminUser) return <AdminUserLeftbar user={adminUser} />;
  return <Leftbar />;
}
