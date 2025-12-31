import { useEffect, useState } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#FF6384", "#FFCE56", "#36A2EB"];

export default function SalesReports() {
  const { status } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/reports/sales-summary")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, [status]);

  if (status === "loading" || !stats) return <p>Loading…</p>;

  const overviewData = [
    { name: "Total", value: stats.total },
    { name: "Closed", value: stats.closed },
    { name: "Won", value: stats.won },
    { name: "Lost", value: stats.lost },
  ];

  const leadLevelData = [
    { name: "Hot", value: stats.hot },
    { name: "Warm", value: stats.warm },
    { name: "Cold", value: stats.cold },
  ];

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <title>My Sales Report</title>
      </Head>

      <div className="main-nav">
        {/* KPIs Summary Cards */}
        <div className="row">
          {[
            { label: "Total Leads", value: stats.total, color: "bg-primary" },
            { label: "Deals Closed", value: stats.closed, color: "bg-success" },
            { label: "Won", value: stats.won, color: "bg-info" },
            { label: "Lost", value: stats.lost, color: "bg-danger" },
          ].map((c) => (
            <div className="col-lg-3 col-md-6" key={c.label}>
              <div className={`card ${c.color} text-white`}>
                <div className="body text-center">
                  <h4 className="mb-1">{c.value}</h4>
                  <span>{c.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="row ">
          {/* Bar Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="body">
                <h5 className="mb-3">Deal Performance</h5>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={overviewData}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#007bff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="body">
                <h5 className="mb-3">Lead Levels</h5>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={leadLevelData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label
                    >
                      {leadLevelData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
