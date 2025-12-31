
// import React, { useMemo, useState, useEffect } from "react";
// import Head from "next/head";
// import Dashnav from "@/components/Dashnav";
// import Leftbar from "@/components/Leftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import Link from "next/link";

// export default function Teams() {
//   const [leftTab, setLeftTab] = useState("employees"); // employees | departments
//   const [activeTab, setActiveTab] = useState("all"); // right-side tabs
//   const [query, setQuery] = useState("");
//   const [search, setSearch] = useState("");
//   const [employees, setEmployees] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [selectedDept, setSelectedDept] = useState(null);

//   const TABS = [
//     { id: "all", label: "All People" },
//     { id: "online", label: "Online" },
//     { id: "offline", label: "Offline" },
//     { id: "placeholders", label: "Placeholders" },
//   ];

//   // Fetch Employees
//   useEffect(() => {
//     const fetchEmployees = async () => {
//       try {
//         const token =
//           localStorage.getItem("adminToken") ||
//           localStorage.getItem("employeeToken");

//         const res = await fetch("/api/employee/all", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         const data = await res.json();
//         if (data.success) {
//           setEmployees(data.employees || []);
//         }
//       } catch (err) {
//         console.error("Error fetching employees:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchEmployees();
//   }, []);

//   // TODO: Replace with your real API for departments if available
//   useEffect(() => {
//     setDepartments([
//       { id: 1, name: "Human Resources", members: 4 },
//       { id: 2, name: "Engineering", members: 10 },
//       { id: 3, name: "Marketing", members: 6 },
//     ]);
//   }, []);

//   // Filtering employees
//   const filteredEmployees = useMemo(() => {
//     let data = employees;

//     if (activeTab === "online") {
//       data = data.filter(
//         (e) => e.professional?.status?.toLowerCase() === "online"
//       );
//     }
//     if (activeTab === "offline") {
//       data = data.filter(
//         (e) => e.professional?.status?.toLowerCase() === "offline"
//       );
//     }
//     if (activeTab === "placeholders") {
//       data = data.filter((e) => !e.personal?.avatar);
//     }

//     if (search.trim()) {
//       const q = search.trim().toLowerCase();
//       data = data.filter(
//         (e) =>
//           e.personal?.firstName?.toLowerCase().includes(q) ||
//           e.personal?.lastName?.toLowerCase().includes(q) ||
//           e.professional?.department?.toLowerCase().includes(q)
//       );
//     }
//     return data;
//   }, [activeTab, employees, search]);

//   return (
//     <div className="add-employee-area">
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
//         />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
//         />
//         <title>Teams</title>
//       </Head>

//       <div className="main-nav">
//         <Leftbar />
//         <LeftbarMobile />
//         <Dashnav />

//         <section className="content home">
//           <div className="block-header add-emp-area">
//             <div className="d-flex">
//               {/* Sidebar */}
//               <aside style={{ width: 220 }} className="left-panel bg-light p-3">
//                 <h5 className="mb-4">Team</h5>
//                 <ul className="nav flex-column">
//                   <li className="nav-item mb-2">
//                     <button
//                       className={`nav-link ${
//                         leftTab === "employees" ? "active" : ""
//                       }`}
//                       onClick={() => setLeftTab("employees")}
//                     >
//                       <i className="bi bi-people-fill me-2"></i>All employees
//                     </button>
//                   </li>
//                   <li className="nav-item">
//                     <button
//                       className={`nav-link ${
//                         leftTab === "departments" ? "active" : ""
//                       }`}
//                       onClick={() => setLeftTab("departments")}
//                     >
//                       <i className="bi bi-building me-2"></i>Departments
//                     </button>
//                   </li>
//                 </ul>
//               </aside>

//               {/* Main content */}
//               <main className="flex-grow-1 main-content p-4">
//                 {leftTab === "employees" && (
//                   <>
//                     {/* Header */}
//                     <div className="d-flex justify-content-between align-items-center top-row mb-3">
//                       <h4 className="m-0 text-dark">All Team</h4>
//                       <div className="d-flex gap-2 filter-bx-row">
//                         <a
//                           href="/dashboard/admin/add-employee"
//                           className="invite-btn"
//                         >
//                           + Add New Employee
//                         </a>
//                       </div>
//                     </div>

//                     {/* Search + Tabs */}
//                     <div className="search-bar-bx d-flex align-items-center justify-content-between mb-3 gap-3 flex-wrap">
//                       <div className="search-bx-img">
//                         <input
//                           type="text"
//                           placeholder="Search"
//                           value={search}
//                           onChange={(e) => setSearch(e.target.value)}
//                           className="form-control border-light"
//                         />
//                         <img src="/icons/search.png" alt="" />
//                       </div>

//                       <ul className="nav nav-tabs custom-tabs" role="tablist">
//                         {TABS.map((t) => (
//                           <li className="nav-item" key={t.id}>
//                             <button
//                               className={`nav-link ${
//                                 activeTab === t.id ? "active" : ""
//                               }`}
//                               onClick={() => setActiveTab(t.id)}
//                               type="button"
//                             >
//                               {t.label}
//                             </button>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>

//                     {/* Employee cards */}
//                     <div className="row g-3">
//                       {loading ? (
//                         <div className="text-center text-muted py-5">
//                           Loading employees...
//                         </div>
//                       ) : filteredEmployees.length === 0 ? (
//                         <div className="text-center text-muted py-5">
//                           No employees found
//                         </div>
//                       ) : (
//                         filteredEmployees.map((emp) => (
//                           <div
//                             key={emp._id}
//                             className="col-6 col-sm-6 col-md-4 col-lg-2"
//                           >
//                             <div className="employee-card shadow-sm">
//                               {emp.personal?.avatar ? (
//                                 <Link href={`/dashboard/employees/${emp._id}`}>
//                                   <div className="img-wrap">
//                                     <img
//                                       src={emp.personal.avatar}
//                                       alt={`${emp.personal?.firstName} ${emp.personal?.lastName}`}
//                                     />
//                                   </div>
//                                 </Link>
//                               ) : (
//                                 <div className="placeholder-wrap">
//                                   <div className="initials">
//                                     {emp.personal?.firstName
//                                       ? emp.personal.firstName
//                                           .charAt(0)
//                                           .toUpperCase()
//                                       : "?"}
//                                   </div>
//                                 </div>
//                               )}
//                               <div className="card-footer-white">
//                                 <div className="emp-name">
//                                   {emp.personal?.firstName}{" "}
//                                   {emp.personal?.lastName}
//                                 </div>
//                                 <span
//                                   className={`status-dot ${
//                                     emp.professional?.status?.toLowerCase() ||
//                                     "offline"
//                                   }`}
//                                   title={emp.professional?.status || "offline"}
//                                 ></span>
//                               </div>
//                             </div>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   </>
//                 )}

//                 {leftTab === "departments" && (
//                   <>
//                     <h4 className="text-white mb-3">Departments</h4>

//                     {/* If no department is selected → show department cards */}
//                     {!selectedDept && (
//                       <div className="row g-3">
//                         {departments.map((dept) => (
//                           <div key={dept.id} className="col-md-4">
//                             <div
//                               className="dept-card p-4 shadow-sm cursor-pointer"
//                               onClick={() => setSelectedDept(dept)}
//                             >
//                               <h5>{dept.name}</h5>
//                               <p>{dept.members} members</p>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     )}

//                     {/* If department is selected → show employees in that department */}
//                     {selectedDept && (
//                       <div>
//                         <div className="d-flex justify-content-between align-items-center mb-3">
//                           <h5>{selectedDept.name} Department</h5>
//                           <button
//                             className="btn btn-sm btn-outline-light"
//                             onClick={() => setSelectedDept(null)}
//                           >
//                             ← Back to Departments
//                           </button>
//                         </div>

//                         <div className="row g-3">
//                           {employees
//                             .filter(
//                               (emp) =>
//                                 emp.professional?.department ===
//                                 selectedDept.name
//                             )
//                             .map((emp) => (
//                               <div
//                                 key={emp._id}
//                                 className="col-6 col-sm-6 col-md-4 col-lg-2"
//                               >
//                                 <div className="employee-card shadow-sm">
//                                   <Link
//                                     href={`/dashboard/employees/${emp._id}`}
//                                   >
//                                     <div className="img-wrap">
//                                       {emp.personal?.avatar ? (
//                                         <img
//                                           src={emp.personal.avatar}
//                                           alt={emp.personal?.firstName}
//                                         />
//                                       ) : (
//                                         <div className="placeholder-wrap">
//                                           <div className="initials">
//                                             {emp.personal?.firstName
//                                               ?.charAt(0)
//                                               .toUpperCase()}
//                                           </div>
//                                         </div>
//                                       )}
//                                     </div>
//                                   </Link>
//                                   <div className="card-footer-white">
//                                     <div className="emp-name">
//                                       {emp.personal?.firstName}{" "}
//                                       {emp.personal?.lastName}
//                                     </div>
//                                     <span
//                                       className={`status-dot ${
//                                         emp.professional?.status?.toLowerCase() ||
//                                         "offline"
//                                       }`}
//                                     ></span>
//                                   </div>
//                                 </div>
//                               </div>
//                             ))}
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </main>
//             </div>
//           </div>
//         </section>
//       </div>

//       {/* Scoped CSS */}
//       <style jsx>{`
//         .main-content {
//           min-height: 100vh;
//           border-top-left-radius: 8px;
//           padding-bottom: 60px;
//           padding-top: 0 !important;
//         }
//         .nav-link {
//           border: none;
//           background: none;
//           text-align: left;
//           width: 100%;
//           padding: 8px 12px;
//           color: #111 !important;
//         }
//         .nav-link.active {
//           background: #eff6ff;
//           border-radius: 8px;
//           color: #2563eb !important;
//           border-left: 5px solid #2563eb;
//         }
//         .custom-tabs .nav-link {
//           border: none;
//           color: #111 !important;
//           background: transparent;
//           padding: 8px 16px;
//           border-radius: 8px;
//           margin-left: 6px;
//         }
//         .custom-tabs .nav-link.active {
//           background: #ffffff;
//           color: #7152f3 !important;
//         }
//         .employee-card {
//           border-radius: 10px;
//           overflow: hidden;
//           background: transparent;
//           transition: transform 0.14s ease, box-shadow 0.14s ease;
//         }
//         .employee-card:hover {
//           transform: translateY(-6px);
//           box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
//         }
//         .employee-card .img-wrap img {
//           width: 100%;
//           height: 150px;
//           object-fit: cover;
//         }
//         .placeholder-wrap {
//           height: 150px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           background: #5f3bd6;
//         }
//         .placeholder-wrap .initials {
//           color: #fff;
//           font-weight: 700;
//           font-size: 48px;
//         }
//         .card-footer-white {
//           background: #fff;
//           padding: 10px 12px;
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           color: #222;
//         }
//         .status-dot {
//           width: 12px;
//           height: 12px;
//           border-radius: 50%;
//           display: inline-block;
//         }
//         .status-dot.online {
//           background: #22c55e;
//         }
//         .status-dot.offline {
//           background: #d1d5db;
//         }
//         .dept-card {
//           border-radius: 10px;
//           background: #fff;
//           color: #111;
//         }
//       `}</style>
//     </div>
//   );
// }



import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Link from "next/link";

export default function Teams() {
  const [leftTab, setLeftTab] = useState("employees"); // employees | departments
  const [activeTab, setActiveTab] = useState("all"); // right-side tabs
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDept, setSelectedDept] = useState(null);

  const TABS = [
    { id: "all", label: "All People" },
    { id: "online", label: "Online" },
    { id: "offline", label: "Offline" },
    { id: "placeholders", label: "Placeholders" },
  ];

  // Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token =
          localStorage.getItem("adminToken") ||
          localStorage.getItem("employeeToken");

        const res = await fetch("/api/employee/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Build departments dynamically from employees
  useEffect(() => {
    if (employees.length > 0) {
      const deptMap = {};
      employees.forEach((emp) => {
        const dept = emp.professional?.department || "Unassigned";
        if (!deptMap[dept]) {
          deptMap[dept] = { id: dept, name: dept, members: 0 };
        }
        deptMap[dept].members += 1;
      });

      setDepartments(Object.values(deptMap));
    }
  }, [employees]);

  // Filtering employees
  const filteredEmployees = useMemo(() => {
    let data = employees;

    if (activeTab === "online") {
      data = data.filter(
        (e) => e.professional?.status?.toLowerCase() === "online"
      );
    }
    if (activeTab === "offline") {
      data = data.filter(
        (e) => e.professional?.status?.toLowerCase() === "offline"
      );
    }
    if (activeTab === "placeholders") {
      data = data.filter((e) => !e.personal?.avatar);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (e) =>
          e.personal?.firstName?.toLowerCase().includes(q) ||
          e.personal?.lastName?.toLowerCase().includes(q) ||
          e.professional?.department?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [activeTab, employees, search]);

  return (
    <div className="add-employee-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <title>Teams</title>
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="block-header add-emp-area">
            <div className="d-flex">
              {/* Sidebar */}
              <aside style={{ width: 220 }} className="left-panel bg-light p-3">
                <h5 className="mb-4">Team</h5>
                <ul className="nav flex-column">
                  <li className="nav-item mb-2">
                    <button
                      className={`nav-link ${
                        leftTab === "employees" ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedDept(null);
                        setLeftTab("employees");
                      }}
                    >
                      <i className="bi bi-people-fill me-2"></i>All employees
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        leftTab === "departments" ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedDept(null);
                        setLeftTab("departments");
                      }}
                    >
                      <i className="bi bi-building me-2"></i>Departments
                    </button>
                  </li>
                </ul>
              </aside>

              {/* Main content */}
              <main className="flex-grow-1 main-content p-4">
                {leftTab === "employees" && (
                  <>
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center top-row mb-3">
                      <h4 className="m-0 text-dark">All Team</h4>
                      <div className="d-flex gap-2 filter-bx-row">
                        <a
                          href="/dashboard/admin/add-employee"
                          className="invite-btn"
                        >
                          + Add New Employee
                        </a>
                      </div>
                    </div>

                    {/* Search + Tabs */}
                    <div className="search-bar-bx d-flex align-items-center justify-content-between mb-3 gap-3 flex-wrap">
                      <div className="search-bx-img">
                        <input
                          type="text"
                          placeholder="Search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="form-control border-light"
                        />
                        <img src="/icons/search.png" alt="" />
                      </div>

                      <ul className="nav nav-tabs custom-tabs" role="tablist">
                        {TABS.map((t) => (
                          <li className="nav-item" key={t.id}>
                            <button
                              className={`nav-link ${
                                activeTab === t.id ? "active" : ""
                              }`}
                              onClick={() => setActiveTab(t.id)}
                              type="button"
                            >
                              {t.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Employee cards */}
                    <div className="row g-3">
                      {loading ? (
                        <div className="text-center text-muted py-5">
                          Loading employees...
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <div
                            key={emp._id}
                            className="col-6 col-sm-6 col-md-4 col-lg-2"
                          >
                            <Link href={`/dashboard/employees/${emp._id}`}>
                            <div className="employee-card shadow-sm">
                              {emp.personal?.avatar ? (
                                
                                  <div className="img-wrap">
                                    <img
                                      src={emp.personal.avatar}
                                      alt={`${emp.personal?.firstName} ${emp.personal?.lastName}`}
                                    />
                                  </div>
                              
                              ) : (
                                <div className="placeholder-wrap">
                                  <div className="initials">
                                    {emp.personal?.firstName
                                      ? emp.personal.firstName
                                          .charAt(0)
                                          .toUpperCase()
                                      : "?"}
                                  </div>
                                </div>
                              )}
                              <div className="card-footer-white">
                                <div className="emp-name">
                                  {emp.personal?.firstName}{" "}
                                  {emp.personal?.lastName}
                                </div>
                                <span
                                  className={`status-dot ${
                                    emp.professional?.status?.toLowerCase() ||
                                    "offline"
                                  }`}
                                  title={emp.professional?.status || "offline"}
                                ></span>
                              </div>
                            </div>
                              </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {leftTab === "departments" && (
                  <>
                    <h4 className="text-dark mb-3">Departments</h4>

                    {/* If no department is selected → show department cards */}
                    {!selectedDept && (
                      <div className="row g-3 mt-3">
                        {departments.map((dept) => (
                          <div key={dept.id} className="col-md-4">
                            <div
                              className="dept-card cursor-pointer"
                              onClick={() => setSelectedDept(dept)}
                            >
                              <h5>{dept.name}</h5>
                              <p>{dept.members} members</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* If department is selected → show employees in that department */}
                    {selectedDept && (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5>{selectedDept.name} Department</h5>
                          <button
                            className="btn btn-sm btn-outline-secondary back-to-department"
                            onClick={() => setSelectedDept(null)}
                          >
                            ← Back to Departments
                          </button>
                        </div>

                        <div className="row g-3">
                          {employees
                            .filter(
                              (emp) =>
                                (emp.professional?.department || "Unassigned") ===
                                selectedDept.name
                            )
                            .map((emp) => (
                              <div
                                key={emp._id}
                                className="col-6 col-sm-6 col-md-4 col-lg-2"
                              >
                                <div className="employee-card shadow-sm">
                                  <Link
                                    href={`/dashboard/employees/${emp._id}`}
                                  >
                                    <div className="img-wrap">
                                      {emp.personal?.avatar ? (
                                        <img
                                          src={emp.personal.avatar}
                                          alt={emp.personal?.firstName}
                                        />
                                      ) : (
                                        <div className="placeholder-wrap">
                                          <div className="initials">
                                            {emp.personal?.firstName
                                              ?.charAt(0)
                                              .toUpperCase()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                  <div className="card-footer-white">
                                    <div className="emp-name">
                                      {emp.personal?.firstName}{" "}
                                      {emp.personal?.lastName}
                                    </div>
                                    <span
                                      className={`status-dot ${
                                        emp.professional?.status?.toLowerCase() ||
                                        "offline"
                                      }`}
                                    ></span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </div>
        </section>
      </div>

      {/* Scoped CSS */}
      <style jsx>{`
        .main-content {
          min-height: 100vh;
          border-top-left-radius: 8px;
          padding-bottom: 60px;
          padding-top: 0 !important;
        }
             .main-content a{
              text-decoration:none;
             }
        .nav-link {
          border: none;
          background: none;
          text-align: left;
          width: 100%;
          padding: 8px 12px;
          color: #111 !important;
        }
        .nav-link.active {
          background: #eff6ff;
          border-radius: 8px;
          color: #2563eb !important;
          border-left: 5px solid #2563eb;
        }
        .custom-tabs .nav-link {
          border: none;
          color: #111 !important;
          background: transparent;
          padding: 8px 16px;
          border-radius: 8px;
          margin-left: 6px;
        }
        .custom-tabs .nav-link.active {
          background: #ffffff;
          color: #7152f3 !important;
        }
        .employee-card {
          border-radius: 10px;
          overflow: hidden;
          background: transparent;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }
        .employee-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
        }
        .employee-card .img-wrap img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }
        .placeholder-wrap {
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #5f3bd6;
        }
        .placeholder-wrap .initials {
          color: #fff;
          font-weight: 700;
          font-size: 48px;
        }
        .card-footer-white {
          background: #fff;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #222;
        }
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.online {
          background: #22c55e;
        }
        .status-dot.offline {
          background: #d1d5db;
        }
        .dept-card {
          border-radius: 10px;
          background: #fff;
          color: #111;
          border:1px solid #E8E8E8;
        }
        .cursor-pointer {
          cursor: pointer;
        }

        .dept-card h5{
            background: #5641CE;
            color: white;
            padding: 10px;
            border-radius: 10px 10px 0px 0px;
            }

            .dept-card p{
                padding: 0px 10px 10px 10px;
            }
              
            .back-to-department{
                background: #eff6ff;
    border-radius: 8px;
    color: #2563eb !important;
            }

      `}</style>
    </div>
  );
}
