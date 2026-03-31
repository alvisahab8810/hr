// pages/dashboard/admin/employee-profile/[id].js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const TABS = [
  { key: "overview",      label: "Overview",        icon: "bi-grid-fill"         },
  { key: "personal",      label: "Personal",         icon: "bi-person-fill"       },
  { key: "professional",  label: "Professional",     icon: "bi-briefcase-fill"    },
  { key: "salary",        label: "Salary & Bank",    icon: "bi-cash-stack"        },
  { key: "documents",     label: "Documents",        icon: "bi-folder2-open"      },
];

const STATUS_COLORS = {
  Permanent:  { bg:"#D1FAE5", color:"#065F46" },
  Probation:  { bg:"#FEF3C7", color:"#92400E" },
  Contract:   { bg:"#DBEAFE", color:"#1E40AF" },
  Intern:     { bg:"#EDE9FE", color:"#5B21B6" },
};

const TYPE_COLORS = {
  Office: { bg:"#F3F4F6", color:"#374151" },
  Remote: { bg:"#ECFDF5", color:"#065F46" },
  Hybrid: { bg:"#EFF6FF", color:"#1D4ED8" },
};

function InfoRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      padding:"11px 0", borderBottom:"1px solid #F3F4F6", gap:12,
    }}>
      <span style={{ fontSize:13, color:"#9CA3AF", fontWeight:500, flexShrink:0 }}>{label}</span>
      <span style={{
        fontSize:13, color:"#111827", fontWeight:600, textAlign:"right",
        fontFamily: mono ? "monospace" : undefined, wordBreak:"break-all",
      }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background:"#fff", borderRadius:16, padding:"20px 22px",
      boxShadow:"0 1px 6px rgba(0,0,0,0.07)", marginBottom:16,
    }}>
      {title && (
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          marginBottom:14, paddingBottom:12,
          borderBottom:"1px solid #F3F4F6",
        }}>
          <div style={{
            width:32, height:32, borderRadius:9,
            background:"linear-gradient(135deg,#EEF2FF,#DDD6FE)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <i className={`bi ${icon}`} style={{ color:"#4F46E5", fontSize:15 }} />
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function DocLink({ label, url, icon = "bi-file-earmark" }) {
  if (!url) return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"12px 14px", borderRadius:10,
      background:"#F9FAFB", border:"1px dashed #E5E7EB",
    }}>
      <i className={`bi ${icon}`} style={{ color:"#D1D5DB", fontSize:18 }} />
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:"#9CA3AF" }}>{label}</div>
        <div style={{ fontSize:11, color:"#D1D5DB" }}>Not uploaded</div>
      </div>
    </div>
  );
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"12px 14px", borderRadius:10,
        background:"#F0FDF4", border:"1px solid #BBF7D0",
        textDecoration:"none", transition:"all 0.15s",
      }}
    >
      <div style={{
        width:36, height:36, borderRadius:9,
        background:"linear-gradient(135deg,#D1FAE5,#A7F3D0)",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <i className={`bi ${icon}`} style={{ color:"#059669", fontSize:17 }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#065F46", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {label}
        </div>
        <div style={{ fontSize:11, color:"#6EE7B7", marginTop:1 }}>Click to view</div>
      </div>
      <i className="bi bi-box-arrow-up-right" style={{ color:"#059669", fontSize:13, flexShrink:0 }} />
    </a>
  );
}

export default function EmployeeProfilePage({ id }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/employee/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEmployee(d.employee); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const emp  = employee || {};
  const p    = emp.personal     || {};
  const prof = emp.professional || {};
  const sal  = emp.salary       || {};
  const docs = emp.documents    || {};

  const fullName   = `${p.firstName || emp.firstName || ""} ${p.lastName || emp.lastName || ""}`.trim() || "—";
  const initials   = `${(p.firstName || emp.firstName || "?")[0]}${(p.lastName || emp.lastName || "")[0] || ""}`.toUpperCase();
  const statusMeta = STATUS_COLORS[prof.status] || { bg:"#F3F4F6", color:"#374151" };
  const typeMeta   = TYPE_COLORS[prof.employeeType] || { bg:"#F3F4F6", color:"#374151" };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          {/* Breadcrumb */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/admin/employee-management">
                  <i className="bi bi-people-fill" style={{ marginRight:6 }} />Employee Management
                </Link>
              </li>
              <li className="breadcrumb-item active" style={{ color:"#6B7280" }}>Employee Profile</li>
            </ul>
          </div>

          <div className="block-header" style={{ padding:"16px 20px", minHeight:"90vh" }}>
            {loading ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:14, flexDirection:"column" }}>
                <div style={{
                  width:48, height:48, border:"3px solid #4F46E5", borderTopColor:"transparent",
                  borderRadius:"50%", animation:"spin 0.9s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
                <span style={{ color:"#9CA3AF", fontSize:13 }}>Loading profile…</span>
              </div>
            ) : !employee ? (
              <div style={{ textAlign:"center", padding:"80px 20px" }}>
                <i className="bi bi-person-x" style={{ fontSize:56, color:"#E5E7EB" }} />
                <h5 style={{ color:"#374151", marginTop:16 }}>Employee not found</h5>
                <Link href="/dashboard/admin/employee-management" style={{ color:"#4F46E5", fontWeight:600 }}>
                  Back to list
                </Link>
              </div>
            ) : (
              <>
                {/* ── HERO CARD ─────────────────────────────── */}
                <div style={{
                  background:"linear-gradient(135deg,#1e1b4b 0%,#4338CA 60%,#6D28D9 100%)",
                  borderRadius:20, padding:"28px 24px 0", marginBottom:20,
                  position:"relative", overflow:"hidden",
                }}>
                  {/* decorative circles */}
                  <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
                  <div style={{ position:"absolute", top:20, right:60, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

                  <div style={{ display:"flex", alignItems:"flex-start", gap:18, flexWrap:"wrap", position:"relative", zIndex:1 }}>
                    {/* Avatar */}
                    <div style={{ flexShrink:0 }}>
                      {p.avatar ? (
                        <img
                          src={p.avatar} alt={fullName}
                          style={{ width:84, height:84, borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(255,255,255,0.25)" }}
                        />
                      ) : (
                        <div style={{
                          width:84, height:84, borderRadius:"50%",
                          background:"linear-gradient(135deg,#818CF8,#A78BFA)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:30, fontWeight:900, color:"#fff",
                          border:"3px solid rgba(255,255,255,0.25)",
                        }}>
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <h2 style={{ color:"#fff", fontWeight:800, fontSize:22, margin:"0 0 4px", lineHeight:1.2 }}>
                        {fullName}
                      </h2>
                      <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginBottom:12 }}>
                        {prof.designation || "—"} · {prof.department || "—"}
                      </div>

                      {/* Badges row */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                        {prof.employeeId && (
                          <span style={{
                            background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
                            borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700, color:"#fff",
                          }}>
                            <i className="bi bi-hash" style={{ marginRight:3 }} />{prof.employeeId}
                          </span>
                        )}
                        {prof.status && (
                          <span style={{
                            background: statusMeta.bg, color: statusMeta.color,
                            borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700,
                          }}>
                            {prof.status}
                          </span>
                        )}
                        {prof.employeeType && (
                          <span style={{
                            background: typeMeta.bg, color: typeMeta.color,
                            borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700,
                          }}>
                            <i className={`bi bi-${prof.employeeType === "Remote" ? "house" : prof.employeeType === "Hybrid" ? "arrow-left-right" : "building"}`} style={{ marginRight:4 }} />
                            {prof.employeeType}
                          </span>
                        )}
                        {emp.faceEnrolled && (
                          <span style={{
                            background:"rgba(16,185,129,0.2)", border:"1px solid rgba(16,185,129,0.4)",
                            borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700, color:"#6EE7B7",
                          }}>
                            <i className="bi bi-shield-lock-fill" style={{ marginRight:4 }} />Face ID
                          </span>
                        )}
                        <span style={{
                          background: emp.hasCompletedProfile ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                          border:`1px solid ${emp.hasCompletedProfile ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
                          borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700,
                          color: emp.hasCompletedProfile ? "#6EE7B7" : "#FCD34D",
                        }}>
                          <i className={`bi bi-${emp.hasCompletedProfile ? "check-circle-fill" : "exclamation-circle-fill"}`} style={{ marginRight:4 }} />
                          {emp.hasCompletedProfile ? "Profile Complete" : "Profile Incomplete"}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display:"flex", gap:8, flexShrink:0, alignSelf:"flex-start" }}>
                      <Link
                        href="/dashboard/admin/employee-management"
                        style={{
                          display:"flex", alignItems:"center", gap:6,
                          background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
                          borderRadius:10, padding:"8px 14px",
                          fontSize:12, fontWeight:600, color:"#fff", textDecoration:"none",
                        }}
                      >
                        <i className="bi bi-arrow-left" style={{ fontSize:14 }} />
                        Back
                      </Link>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display:"flex", gap:2, marginTop:4, overflowX:"auto" }}>
                    {TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          display:"flex", alignItems:"center", gap:6,
                          padding:"12px 16px", border:"none", background:"transparent",
                          cursor:"pointer", fontSize:13, fontWeight:600,
                          whiteSpace:"nowrap",
                          color: activeTab === tab.key ? "#fff" : "rgba(255,255,255,0.5)",
                          borderBottom: activeTab === tab.key ? "2px solid #A78BFA" : "2px solid transparent",
                          transition:"all 0.15s",
                        }}
                      >
                        <i className={`bi ${tab.icon}`} style={{ fontSize:14 }} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── TAB CONTENT ───────────────────────────── */}

                {/* OVERVIEW */}
                {activeTab === "overview" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <SectionCard title="Employment Info" icon="bi-briefcase-fill">
                      <InfoRow label="Employee ID"   value={prof.employeeId} />
                      <InfoRow label="Department"    value={prof.department} />
                      <InfoRow label="Designation"   value={prof.designation} />
                      <InfoRow label="Type"          value={prof.employeeType} />
                      <InfoRow label="Status"        value={prof.status} />
                      <InfoRow label="Joined"        value={fmtDate(prof.dateOfJoining)} />
                      <InfoRow label="Official Email" value={prof.officialEmail} />
                    </SectionCard>

                    <SectionCard title="Contact & Personal" icon="bi-person-fill">
                      <InfoRow label="Full Name"    value={fullName} />
                      <InfoRow label="Mobile"       value={p.mobile} />
                      <InfoRow label="Personal Email" value={p.email} />
                      <InfoRow label="Date of Birth" value={fmtDate(p.dob)} />
                      <InfoRow label="Marital Status" value={p.maritalStatus} />
                      <InfoRow label="City"         value={p.city} />
                      <InfoRow label="State"        value={p.state} />
                    </SectionCard>

                    <SectionCard title="Compensation" icon="bi-cash-stack">
                      <InfoRow label="Monthly Salary"
                        value={sal.monthlySalary ? `₹${Number(sal.monthlySalary).toLocaleString("en-IN")}` : undefined} />
                      <InfoRow label="Annual Salary"
                        value={sal.annualSalary ? `₹${Number(sal.annualSalary).toLocaleString("en-IN")}` : undefined} />
                      <InfoRow label="Bank"          value={sal.bankName} />
                      <InfoRow label="Account Holder" value={sal.accountHolderName} />
                      <InfoRow label="PAN Number"    value={sal.panNumber} mono />
                    </SectionCard>

                    <SectionCard title="System" icon="bi-gear-fill">
                      <InfoRow label="Account Email"  value={emp.email} />
                      <InfoRow label="Joined Platform" value={fmtDate(emp.createdAt)} />
                      <InfoRow label="Face ID"         value={emp.faceEnrolled ? "Enrolled" : "Not enrolled"} />
                      <InfoRow label="Profile"         value={emp.hasCompletedProfile ? "Complete" : "Incomplete"} />
                    </SectionCard>
                  </div>
                )}

                {/* PERSONAL */}
                {activeTab === "personal" && (
                  <SectionCard title="Personal Information" icon="bi-person-fill">
                    <InfoRow label="First Name"      value={p.firstName} />
                    <InfoRow label="Last Name"       value={p.lastName} />
                    <InfoRow label="Mobile"          value={p.mobile} />
                    <InfoRow label="Personal Email"  value={p.email} />
                    <InfoRow label="Date of Birth"   value={fmtDate(p.dob)} />
                    <InfoRow label="Father's Name"   value={p.fatherName} />
                    <InfoRow label="Mother's Name"   value={p.motherName} />
                    <InfoRow label="Marital Status"  value={p.maritalStatus} />
                    <InfoRow label="Address"         value={p.address} />
                    <InfoRow label="City"            value={p.city} />
                    <InfoRow label="State"           value={p.state} />
                    <InfoRow label="ZIP Code"        value={p.zip} />
                  </SectionCard>
                )}

                {/* PROFESSIONAL */}
                {activeTab === "professional" && (
                  <SectionCard title="Professional Information" icon="bi-briefcase-fill">
                    <InfoRow label="Employee ID"     value={prof.employeeId} />
                    <InfoRow label="Official Email"  value={prof.officialEmail} />
                    <InfoRow label="Department"      value={prof.department} />
                    <InfoRow label="Designation"     value={prof.designation} />
                    <InfoRow label="Employee Type"   value={prof.employeeType} />
                    <InfoRow label="Status"          value={prof.status} />
                    <InfoRow label="Date of Joining" value={fmtDate(prof.dateOfJoining)} />
                  </SectionCard>
                )}

                {/* SALARY & BANK */}
                {activeTab === "salary" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <SectionCard title="Compensation" icon="bi-cash-stack">
                      <InfoRow label="Monthly Salary"
                        value={sal.monthlySalary ? `₹${Number(sal.monthlySalary).toLocaleString("en-IN")}` : undefined} />
                      <InfoRow label="Annual Salary"
                        value={sal.annualSalary ? `₹${Number(sal.annualSalary).toLocaleString("en-IN")}` : undefined} />
                    </SectionCard>

                    <SectionCard title="Bank Details" icon="bi-bank">
                      <InfoRow label="Account Holder" value={sal.accountHolderName} />
                      <InfoRow label="Bank Name"      value={sal.bankName} />
                      <InfoRow label="Branch"         value={sal.branch} />
                      <InfoRow label="Account No."    value={sal.accountNumber} mono />
                      <InfoRow label="IFSC Code"      value={sal.ifscCode} mono />
                      <InfoRow label="PAN Number"     value={sal.panNumber} mono />
                      <InfoRow label="UPI ID"         value={sal.upiId} />
                    </SectionCard>
                  </div>
                )}

                {/* DOCUMENTS */}
                {activeTab === "documents" && (
                  <div>
                    <SectionCard title="Uploaded Documents" icon="bi-folder2-open">
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <DocLink
                          label="Appointment Letter"
                          url={docs.appointmentLetter}
                          icon="bi-file-earmark-text"
                        />
                        <DocLink
                          label="Relieving Letter"
                          url={docs.relievingLetter}
                          icon="bi-file-earmark-check"
                        />
                        <DocLink
                          label="Experience Letter"
                          url={docs.experienceLetter}
                          icon="bi-file-earmark-person"
                        />
                      </div>

                      {/* Salary Slips */}
                      {docs.salarySlips && docs.salarySlips.length > 0 ? (
                        <div style={{ marginTop:16 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#6B7280", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>
                            Salary Slips ({docs.salarySlips.length})
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                            {docs.salarySlips.map((url, i) => (
                              <DocLink
                                key={i}
                                label={`Salary Slip ${i + 1}`}
                                url={url}
                                icon="bi-file-earmark-spreadsheet"
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          marginTop:16, padding:"14px 16px",
                          background:"#F9FAFB", borderRadius:10, border:"1px dashed #E5E7EB",
                        }}>
                          <span style={{ fontSize:13, color:"#9CA3AF" }}>
                            <i className="bi bi-info-circle" style={{ marginRight:6 }} />
                            No salary slips uploaded yet.
                          </span>
                        </div>
                      )}
                    </SectionCard>

                    {/* Profile Photo */}
                    {p.avatar && (
                      <SectionCard title="Profile Photo" icon="bi-image">
                        <img
                          src={p.avatar} alt="Profile"
                          style={{ width:120, height:120, borderRadius:16, objectFit:"cover", border:"2px solid #E5E7EB" }}
                        />
                      </SectionCard>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 767px) {
          /* Stack two-column grids on small mobile */
          .block-header [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { req, params } = context;
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: { id: params.id } };
}
