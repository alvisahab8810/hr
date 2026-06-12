import React, { useEffect, useState } from "react";
import Link from "next/link";
import Dashnav from "../../components/Dashnav";
import Leftbar from "../../components/Leftbar";
import Head from "next/head";
import { getSocket } from "@/utils/socket";
import BirthdayCelebration from "@/components/BirthdayCelebration";

export default function Admin() {
  const [employeeStatus, setEmployeeStatus] = useState({});
  const [todayBirthdays, setTodayBirthdays] = useState([]);

  useEffect(() => {
    fetch("/api/socket");

    const socket = getSocket();

    const onConnect = () => {
      socket.emit("admin:requestSnapshot");
    };

    const onStatusUpdate = (data) => {
      setEmployeeStatus((prev) => ({
        ...prev,
        [data.employeeId]: data,
      }));
    };

    const onSnapshot = (snapshot) => {
      const statusMap = {};
      snapshot.forEach((item) => {
        statusMap[item.employeeId] = item;
      });
      setEmployeeStatus(statusMap);
    };

    socket.on("connect", onConnect);
    socket.on("employeeStatusUpdate", onStatusUpdate);
    socket.on("employeeStatusSnapshot", onSnapshot);

    return () => {
      socket.off("connect", onConnect);
      socket.off("employeeStatusUpdate", onStatusUpdate);
      socket.off("employeeStatusSnapshot", onSnapshot);
    };
  }, []);

  useEffect(() => {
    fetch("/api/employee/birthdays/today")
      .then(r => r.json())
      .then(d => { if (d.success) setTodayBirthdays(d.birthdays || []); })
      .catch(console.error);
  }, []);

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/main.css" />
      </Head>

      <div className="main-nav">
        <Dashnav />
        <Leftbar />

        <section className="content home">
          <div className="block-header">
            {/* ── Birthday Celebration ── */}
            {todayBirthdays.length > 0 && (
              <BirthdayCelebration mode="team" birthdays={todayBirthdays} />
            )}

            <div className="row ptb-50">
              <div className="col-lg-7 col-md-6 col-sm-12">
                <h2>
                  Dashboard
                  <small className="text-muted">Welcome to Viralon</small>
                </h2>
              </div>
              <div className="col-lg-5 col-md-6 col-sm-12">
                <ul className="breadcrumb float-md-right">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard/dashboard">
                      <i className="zmdi zmdi-home"></i> Viralon
                    </Link>
                  </li>
                  <li className="breadcrumb-item active">Dashboard</li>
                </ul>
              </div>
            </div>

            <div className="card p-3 mb-4">
              <h4 className="mb-3">Employee Activity</h4>
              <div className="row">
                {Object.values(employeeStatus).length > 0 ? (
                  Object.values(employeeStatus).map((emp) => (
                    <div className="col-md-4 mb-3" key={emp.employeeId}>
                      <div className="card shadow-sm p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">{emp.name}</h6>
                          <span className={`badge ${emp.status === "online" ? "bg-success" : "bg-secondary"}`}>
                            {emp.status}
                          </span>
                        </div>
                        <p className="mb-1 text-muted">
                          <strong>Last Active:</strong>{" "}
                          {new Date(emp.lastActive).toLocaleTimeString()}
                        </p>
                        {emp.browser && <p className="mb-1"><strong>Browser:</strong> {emp.browser}</p>}
                        {emp.url && (
                          <p className="mb-1">
                            <strong>Page:</strong>{" "}
                            <span className="text-truncate d-inline-block" style={{ maxWidth: "180px" }}>{emp.url}</span>
                          </p>
                        )}
                        {typeof emp.clicks !== "undefined" && (
                          <p className="mb-0"><strong>Clicks:</strong> {emp.clicks}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">No activity yet…</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { req } = context;
  const cookie = req.headers.cookie || "";

  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }

  return { props: {} };
}
