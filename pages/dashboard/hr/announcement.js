import { useEffect, useState } from "react";
import Head from "next/head";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
export default function CreateAnnouncement() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/announcements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          priority,
          startDate,
          endDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Announcement created successfully!");
        // reset form
        setTitle("");
        setMessage("");
        setPriority("normal");
        setStartDate("");
        setEndDate("");
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (err) {
      console.error("Error creating announcement:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="main-nav">
        <LeftbarMobile />
        <Dashnav />
        <Leftbar />

        <section className="create-announcement content home">
          <div className="block-header">
            <div className="card shadow-sm p-4 mb-4">
              <h4 className="mt-0">Create Announcement</h4>
              <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Message */}
                <div className="mb-3">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                {/* Priority */}
                <div className="mb-3">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="row mb-3">
                  <div className="col">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="invite-btn mt-3"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Announcement"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
