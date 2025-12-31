// File: pages/dashboard/salesperson/profile.js

import { useState, useEffect } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Link from "next/link";

export default function SalesProfilePage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const [form, setForm] = useState({ name: "", email: "", phone: "", about: "", avatarUrl: "" });
  const [editMode, setEditMode] = useState(false);

  /* ────────────────────────────────────────────────────────────── */
  /* Fetch the current user profile                               */
  /* ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!session?.user?.email) return;

    async function fetchProfile() {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || "",
          email: data.email,
          phone: data.phone || "",
          about: data.about || "",
          avatarUrl: data.avatarUrl || "",
        });
      } else {
        toast.error("Failed to load profile");
      }
    }

    fetchProfile();
  }, [session]);

  /* ────────────────────────────────────────────────────────────── */
  /* Handle form submission (update profile)                       */
  /* ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/user/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Profile updated");
      setEditMode(false);
    } else {
      const { message } = await res.json();
      toast.error(message || "Update failed");
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div className="profile-card">
      <Head>
        <title>My Profile</title>
      </Head>

      
      {/* Avatar */}
      <div className="mb-4 text-center">
        <img
          src={form.avatarUrl || "/asets/images/avatar.png"}
          alt="avatar"
          width={100}
          height={100}
          className="rounded-circle shadow"
        />
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: 520 }}>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email (readonly)</label>
            <input className="form-control" value={form.email} readOnly />
          </div>

          <div className="mb-3">
            <label className="form-label">Phone</label>
            <input
              className="form-control"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">About</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label">Avatar URL</label>
            <input
              className="form-control"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary me-2">
            Save
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="mx-auto" style={{ maxWidth: 520 }}>
          <p><strong>Name:</strong> {form.name}</p>
          <p><strong>Email:</strong> {form.email}</p>
          <p><strong>Phone:</strong> {form.phone || "–"}</p>
          <p><strong>About:</strong> {form.about || "–"}</p>

          <button className="btn btn-primary" onClick={() => setEditMode(true)}>
            Edit Profile
          </button>
          <Link href="/dashboard/salesperson" className="btn btn-link ms-3">
            Back to Dashboard
          </Link>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={1500} />
    </div>
  );
}

