// "use client";
// import React, { useState } from "react";
// import Head from "next/head";
// import Leftbar from "@/components/Leftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import Dashnav from "@/components/Dashnav";
// import Link from "next/link";
// // --- Services ---
// const SERVICES = [
//   { id: "social", name: "Social Media Marketing" },
//   { id: "seo", name: "Search Engine Optimization" },
//   { id: "ads", name: "Paid Advertisement" },
//   { id: "logo", name: "Logo Design" },
//   { id: "brand", name: "Brand Identity" },
//   { id: "product", name: "Product Design" },
//   { id: "website", name: "Website Development" },
//   { id: "production", name: "Production" },
// ];

// // --- Social Media Platforms ---
// const PLATFORM_FIELDS = {
//   instagram: {
//     label: "Instagram",
//     fields: ["reels", "posts", "carousels", "stories"],
//   },
//   facebook: {
//     label: "Facebook",
//     fields: ["reels", "posts", "carousels", "stories"],
//   },
//   youtube: { label: "YouTube", fields: ["longFormVideos", "shortFormVideos"] },
//   linkedin: { label: "LinkedIn", fields: ["reels", "posts", "carousels"] },
// };

// // --- Other Services Fields ---
// const SERVICE_FIELDS = {
//   seo: ["keywords", "backlinks", "technicalAudit"],
//   ads: ["budget", "platforms", "duration"],
//   logo: ["concepts", "revisions"],
//   brand: ["guidelines", "assets", "colorPalette"],
//   product: ["mockups", "prototypes", "specs"],
//   website: ["pages", "features", "CMS"],
//   production: ["shots", "editing", "deliverables"],
// };

// // --- Helper functions ---
// const initialPlatformData = (key) => {
//   const def = PLATFORM_FIELDS[key];
//   const obj = { platformKey: key, label: def.label };
//   def.fields.forEach((f) => (obj[f] = ""));
//   return obj;
// };

// const initialServiceData = (id) => {
//   const fields = SERVICE_FIELDS[id] || [];
//   const obj = { serviceId: id };
//   fields.forEach((f) => (obj[f] = ""));
//   return obj;
// };

// export default function TaskCreator() {
//   const [step, setStep] = useState(1);

//   // --- Basic Info ---
//   const [brandName, setBrandName] = useState("");
//   const [industry, setIndustry] = useState("");

//   // --- Services ---
//   const [selectedServices, setSelectedServices] = useState([]);
//   const [serviceData, setServiceData] = useState([]);

//   // --- Social Media ---
//   const [selectedPlatforms, setSelectedPlatforms] = useState([]);
//   const [platformData, setPlatformData] = useState([]);
//   const [platformIndex, setPlatformIndex] = useState(0);

//   // --- Handlers ---
//   const toggleService = (id) => {
//     if (selectedServices.includes(id)) {
//       setSelectedServices(selectedServices.filter((s) => s !== id));
//       setServiceData(serviceData.filter((s) => s.serviceId !== id));
//       if (id === "social") {
//         setSelectedPlatforms([]);
//         setPlatformData([]);
//       }
//     } else {
//       setSelectedServices([...selectedServices, id]);
//       if (id !== "social") {
//         setServiceData([...serviceData, initialServiceData(id)]);
//       }
//     }
//   };

//   const togglePlatform = (key) => {
//     if (selectedPlatforms.includes(key)) {
//       setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
//       setPlatformData(platformData.filter((p) => p.platformKey !== key));
//     } else {
//       setSelectedPlatforms([...selectedPlatforms, key]);
//       setPlatformData([...platformData, initialPlatformData(key)]);
//     }
//   };

//   const updateServiceField = (serviceId, field, value) => {
//     setServiceData((prev) =>
//       prev.map((s) =>
//         s.serviceId === serviceId ? { ...s, [field]: value } : s
//       )
//     );
//   };

//   const updatePlatformField = (platformKey, field, value) => {
//     setPlatformData((prev) =>
//       prev.map((p) =>
//         p.platformKey === platformKey ? { ...p, [field]: value } : p
//       )
//     );
//   };

//   const goToPlatformWizard = () => {
//     if (selectedPlatforms.length === 0) return setStep(4);
//     setPlatformIndex(0);
//     setStep(3);
//   };

//   const handlePlatformNext = () => {
//     if (platformIndex < selectedPlatforms.length - 1)
//       setPlatformIndex(platformIndex + 1);
//     else setStep(4);
//   };

//   const handlePlatformBack = () => {
//     if (platformIndex > 0) setPlatformIndex(platformIndex - 1);
//     else setStep(2);
//   };

//   const handleSubmitAll = () => {
//     const payload = {
//       brandName,
//       industry,
//       services: selectedServices,
//       serviceData,
//       platforms: platformData,
//     };
//     console.log("FINAL PAYLOAD", payload);
//     alert("Payload logged in console.");
//   };

//   const currentPlatformKey = selectedPlatforms[platformIndex];
//   const currentPlatformData =
//     platformData.find((p) => p.platformKey === currentPlatformKey) ||
//     initialPlatformData(currentPlatformKey || "instagram");

//   return (
//     <div>
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
//         />
//       </Head>
//       <div className="dashboard-container add-employee-area task-management-area">
//         <div className="main-nav">
//           <Leftbar />
//           <LeftbarMobile />
//           <Dashnav />

//           <section className="content home">
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb  bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/dashboard">
//                     <img src="/icons/home.svg"></img> Add New Project
//                   </Link>
//                 </li>
//               </ul>
//             </div>

//             <div className="block-header add-emp-area">
//               <div className="card p-4 full-card-area">
//                 <h4 className="mb-4 mt-0">Create Task — Admin</h4>

//                 {/* Step indicators */}
//                 <div className="mb-4 d-flex gap-2">
//                   {[1, 2, 3, 4].map((s) => (
//                     <button
//                       key={s}
//                       className={`btn btn-sm ${
//                         step === s ? "btn-primary" : "btn-outline-secondary"
//                       }`}
//                       onClick={() => setStep(s)}
//                     >
//                       Step {s}
//                     </button>
//                   ))}
//                 </div>

//                 {/* Step 1: Basic info */}
//                 {step === 1 && (
//                   <div className="row g-3 basic-info">
//                     <div className="col-md-6">
//                       <label className="form-label">Brand Name</label>
//                       <input
//                         className="form-control"
//                         value={brandName}
//                         onChange={(e) => setBrandName(e.target.value)}
//                         placeholder="Brand Name"
//                       />
//                     </div>
//                     <div className="col-md-6">
//                       <label className="form-label">Industry Type</label>
//                       <input
//                         className="form-control"
//                         value={industry}
//                         onChange={(e) => setIndustry(e.target.value)}
//                         placeholder="Industry Type"
//                       />
//                     </div>
//                     <div className="mt-3 d-flex justify-content-end gap-2">
//                       <button
//                         className="cancel-btn"
//                         onClick={() => {
//                           setBrandName("");
//                           setIndustry("");
//                         }}
//                       >
//                         Clear
//                       </button>
//                       <button
//                         className="invite-btn"
//                         onClick={() => {
//                           if (!brandName) return alert("Enter brand name");
//                           setStep(2);
//                         }}
//                       >
//                         Next
//                       </button>
//                     </div>

//                   </div>

//                 )}

//                 {/* Step 2: Service selection + Fields */}
//                 {step === 2 && (
//                   <div className="row g-3">
//                     <div className="col-md-6">
//                       <label className="form-label">Services</label>
//                       <div className="list-group">
//                         {SERVICES.map((s) => (
//                           <button
//                             key={s.id}
//                             className={`list-group-item list-group-item-action`}
//                             onClick={() => {}}
//                           >
//                             <input
//                               type="checkbox"
//                               className="me-2"
//                               checked={selectedServices.includes(s.id)}
//                               onChange={() => toggleService(s.id)}
//                             />
//                             {s.name} <span className="float-end">&gt;</span>
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                     <div className="col-md-6">
//                       <label className="form-label">Details</label>
//                       <div
//                         className="p-3 border rounded"
//                         style={{ maxHeight: 600, overflowY: "auto" }}
//                       >
//                         {selectedServices.length === 0 ? (
//                           <p className="text-muted">
//                             Select a service to see fields.
//                           </p>
//                         ) : (
//                           selectedServices.map((sId) => (
//                             <div key={sId} className="mb-3 border p-2">
//                               <strong>
//                                 {SERVICES.find((s) => s.id === sId)?.name}
//                               </strong>
//                               {sId === "social" ? (
//                                 <>
//                                   <h6>Platforms</h6>
//                                   {Object.keys(PLATFORM_FIELDS).map((pkey) => (
//                                     <div key={pkey} className="form-check py-1">
//                                       <input
//                                         type="checkbox"
//                                         className="form-check-input"
//                                         checked={selectedPlatforms.includes(
//                                           pkey
//                                         )}
//                                         onChange={() => togglePlatform(pkey)}
//                                       />
//                                       <label className="form-check-label ms-2">
//                                         {PLATFORM_FIELDS[pkey].label}
//                                       </label>
//                                     </div>
//                                   ))}
//                                 </>
//                               ) : (
//                                 SERVICE_FIELDS[sId].map((f) => {
//                                   const sData = serviceData.find(
//                                     (sd) => sd.serviceId === sId
//                                   );
//                                   return (
//                                     <div key={f} className="mb-2">
//                                       <label className="form-label">{f}</label>
//                                       <input
//                                         className="form-control"
//                                         value={sData?.[f] || ""}
//                                         onChange={(e) =>
//                                           updateServiceField(
//                                             sId,
//                                             f,
//                                             e.target.value
//                                           )
//                                         }
//                                       />
//                                     </div>
//                                   );
//                                 })
//                               )}
//                             </div>
//                           ))
//                         )}
//                       </div>
//                       <div className="mt-3 d-flex justify-content-end gap-2">
//                         <button
//                           className="btn btn-outline-secondary"
//                           onClick={() => setStep(1)}
//                         >
//                           Back
//                         </button>
//                         <button
//                           className="btn btn-primary"
//                           onClick={goToPlatformWizard}
//                         >
//                           Next
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Step 3: Social Media Platform Wizard */}
//                 {step === 3 && selectedPlatforms.length > 0 && (
//                   <div>
//                     <h6>
//                       Configure {PLATFORM_FIELDS[currentPlatformKey].label}
//                     </h6>
//                     <div className="row g-2">
//                       {PLATFORM_FIELDS[currentPlatformKey].fields.map((f) => (
//                         <div className="col-md-6" key={f}>
//                           <label className="form-label">{f}</label>
//                           <input
//                             className="form-control"
//                             value={currentPlatformData[f]}
//                             onChange={(e) =>
//                               updatePlatformField(
//                                 currentPlatformKey,
//                                 f,
//                                 e.target.value
//                               )
//                             }
//                           />
//                         </div>
//                       ))}
//                     </div>
//                     <div className="mt-3 d-flex justify-content-between">
//                       <button
//                         className="btn btn-outline-secondary"
//                         onClick={handlePlatformBack}
//                       >
//                         Back
//                       </button>
//                       <button
//                         className="btn btn-primary"
//                         onClick={handlePlatformNext}
//                       >
//                         {platformIndex < selectedPlatforms.length - 1
//                           ? "Next Platform"
//                           : "Finish"}
//                       </button>
//                     </div>
//                   </div>
//                 )}

//                 {/* Step 4: Summary */}
//                 {step === 4 && (
//                   <div>
//                     <h5>Summary</h5>
//                     <p>
//                       <strong>Brand:</strong> {brandName} |{" "}
//                       <strong>Industry:</strong> {industry}
//                     </p>
//                     <p>
//                       <strong>Services:</strong> {selectedServices.join(", ")}
//                     </p>

//                     {/* Other services */}
//                     {serviceData.map((s) => (
//                       <div key={s.serviceId} className="border p-2 mb-2">
//                         <strong>
//                           {SERVICES.find((sv) => sv.id === s.serviceId)?.name}
//                         </strong>
//                         {Object.keys(s)
//                           .filter((k) => k !== "serviceId")
//                           .map((f) => (
//                             <div key={f}>
//                               <span className="text-capitalize">{f}:</span>{" "}
//                               {s[f] || "-"}
//                             </div>
//                           ))}
//                       </div>
//                     ))}

//                     {/* Social Media */}
//                     {platformData.map((p) => (
//                       <div key={p.platformKey} className="border p-2 mb-2">
//                         <strong>{p.label}</strong>
//                         {PLATFORM_FIELDS[p.platformKey].fields.map((f) => (
//                           <div key={f}>
//                             <span className="text-capitalize">{f}:</span>{" "}
//                             {p[f] || "-"}
//                           </div>
//                         ))}
//                       </div>
//                     ))}

//                     <div className="mt-3 d-flex justify-content-end gap-2">
//                       <button
//                         className="btn btn-outline-secondary"
//                         onClick={() => setStep(2)}
//                       >
//                         Back
//                       </button>
//                       <button
//                         className="btn btn-primary"
//                         onClick={handleSubmitAll}
//                       >
//                         Submit
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
import React, { useState } from "react";
import Head from "next/head";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import Link from "next/link";

// --- Services ---
const SERVICES = [
  { id: "social", name: "Social Media Marketing" },
  { id: "seo", name: "Search Engine Optimization" },
  { id: "ads", name: "Paid Advertisement" },
  { id: "logo", name: "Logo Design" },
  { id: "brand", name: "Brand Identity" },
  { id: "product", name: "Product Design" },
  { id: "website", name: "Website Development" },
  { id: "production", name: "Production" },
];

// --- Social Media Platforms ---
const PLATFORM_FIELDS = {
  instagram: {
    label: "Instagram",
    fields: ["reels", "posts", "carousels", "stories"],
  },
  facebook: {
    label: "Facebook",
    fields: ["reels", "posts", "carousels", "stories"],
  },
  youtube: { label: "YouTube", fields: ["longFormVideos", "shortFormVideos"] },
  linkedin: { label: "LinkedIn", fields: ["reels", "posts", "carousels"] },
};

// --- Other Services Fields ---
const SERVICE_FIELDS = {
  seo: ["keywords", "backlinks", "technicalAudit"],
  ads: ["budget", "platforms", "duration"],
  logo: ["concepts", "revisions"],
  brand: ["guidelines", "assets", "colorPalette"],
  product: ["mockups", "prototypes", "specs"],
  website: ["pages", "features", "CMS"],
  production: ["shots", "editing", "deliverables"],
};

// --- Helper functions ---
const initialPlatformData = (key) => {
  const def = PLATFORM_FIELDS[key];
  const obj = { platformKey: key, label: def.label };
  def.fields.forEach((f) => (obj[f] = ""));
  return obj;
};

const initialServiceData = (id) => {
  const fields = SERVICE_FIELDS[id] || [];
  const obj = { serviceId: id };
  fields.forEach((f) => (obj[f] = ""));
  return obj;
};

export default function TaskCreator() {
  const [step, setStep] = useState(1);

  // --- Basic Info ---
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");

  // --- Services ---
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceData, setServiceData] = useState([]);

  // --- Social Media ---
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [platformIndex, setPlatformIndex] = useState(0);

  // --- Handlers ---
  const toggleService = (id) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((s) => s !== id));
      setServiceData(serviceData.filter((s) => s.serviceId !== id));
      if (id === "social") {
        setSelectedPlatforms([]);
        setPlatformData([]);
      }
    } else {
      setSelectedServices([...selectedServices, id]);
      if (id !== "social") {
        setServiceData([...serviceData, initialServiceData(id)]);
      }
    }
  };

  const togglePlatform = (key) => {
    if (selectedPlatforms.includes(key)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== key));
      setPlatformData(platformData.filter((p) => p.platformKey !== key));
    } else {
      setSelectedPlatforms([...selectedPlatforms, key]);
      setPlatformData([...platformData, initialPlatformData(key)]);
    }
  };

  const updateServiceField = (serviceId, field, value) => {
    setServiceData((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, [field]: value } : s
      )
    );
  };

  const updatePlatformField = (platformKey, field, value) => {
    setPlatformData((prev) =>
      prev.map((p) =>
        p.platformKey === platformKey ? { ...p, [field]: value } : p
      )
    );
  };

  const goToPlatformWizard = () => {
    if (selectedPlatforms.length === 0) return setStep(3);
    setPlatformIndex(0);
    setStep(2);
  };

  const handlePlatformNext = () => {
    if (platformIndex < selectedPlatforms.length - 1)
      setPlatformIndex(platformIndex + 1);
    else setStep(3);
  };

  const handlePlatformBack = () => {
    if (platformIndex > 0) setPlatformIndex(platformIndex - 1);
    else setStep(1);
  };

  const handleSubmitAll = () => {
    const payload = {
      brandName,
      industry,
      services: selectedServices,
      serviceData,
      platforms: platformData,
    };
    console.log("FINAL PAYLOAD", payload);
    alert("Payload logged in console.");
  };

  const currentPlatformKey = selectedPlatforms[platformIndex];
  const currentPlatformData =
    platformData.find((p) => p.platformKey === currentPlatformKey) ||
    initialPlatformData(currentPlatformKey || "instagram");

  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
      </Head>
      <div className="dashboard-container add-employee-area task-management-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg" /> Add New Project
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="card p-4 full-card-area">
                <h4 className="mb-3 mt-2">Create Task — Admin</h4>

                {/* Step indicators */}
                <div className="mb-4 d-flex gap-2 flex-wrap">
                  {["Details & Services", "Social Platforms", "Summary"].map(
                    (label, index) => (
                      <button
                        key={index}
                        className={`btn btn-sm ${
                          step === index + 1
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setStep(index + 1)}
                      >
                        Step {index + 1}: {label}
                      </button>
                    )
                  )}
                </div>

                {/* Step 1: Basic info + Services */}
                {step === 1 && (
                  <div className="row g-3 ">
                    {/* Basic Info */}
                    <div className="col-md-12 mb-3 basic-info">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Brand Name</label>
                          <input
                            className="form-control"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="Enter Brand Name"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Industry Type</label>
                          <input
                            className="form-control"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            placeholder="Industry Type"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Service Selection */}
                    <div className="col-md-5">
                      <label className="form-label fw-semibold">
                        Select Services
                      </label>
                      <div className="list-group shadow-sm rounded">
                        {SERVICES.map((s) => {
                          const active = selectedServices.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className={`list-group-item d-flex justify-content-between align-items-center service-item ${
                                active
                                  ? "bg-primary text-white fw-semibold"
                                  : "bg-light"
                              }`}
                              style={{
                                cursor: "pointer",
                                transition: "0.3s",
                              }}
                              onClick={() => toggleService(s.id)}
                            >
                              <div className="d-flex align-items-center">
                                {/* <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleService(s.id)}
                                  className="me-2"
                                /> */}
                                {s.name}
                              </div>
                              <i className="bi bi-chevron-right small opacity-75"></i>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Service Details */}
                    <div className="col-md-7">
                      <label className="form-label fw-semibold">
                        Service Details
                      </label>
                      <div
                        className="max"
                        style={{ maxHeight: 600 }}
                        // overflowY: "auto"
                      >
                        {selectedServices.length === 0 ? (
                          <p className="text-muted">
                            Select a service to configure details.
                          </p>
                        ) : (
                          selectedServices.map((sId) => (
                            <div key={sId} className="mb-3   rounded   sub-bxo">
                              <h6 className="service-headings">
                                {SERVICES.find((s) => s.id === sId)?.name}
                              </h6>
                              {sId === "social" ? (
                                <>
                                  <label className="form-label fw-semibold mb-0 mt-3">
                                    Select Platforms
                                  </label>
                                  {Object.keys(PLATFORM_FIELDS).map((pkey) => (
                                    <div key={pkey} className="form-check ">
                                      <input
                                        type="checkbox"
                                        className="form-check-input me-2"
                                        checked={selectedPlatforms.includes(
                                          pkey
                                        )}
                                        onChange={() => togglePlatform(pkey)}
                                      />
                                      <label className="form-check-label">
                                        {PLATFORM_FIELDS[pkey].label}
                                      </label>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                SERVICE_FIELDS[sId].map((f) => {
                                  const sData = serviceData.find(
                                    (sd) => sd.serviceId === sId
                                  );
                                  return (
                                    <div key={f} className="mb-2">
                                      <label className="form-label text-capitalize">
                                        {f}
                                      </label>
                                      <input
                                        className="form-control"
                                        value={sData?.[f] || ""}
                                        onChange={(e) =>
                                          updateServiceField(
                                            sId,
                                            f,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-4 d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-primary"
                        onClick={goToPlatformWizard}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Social Media Platform Wizard */}
                {step === 2 && selectedPlatforms.length > 0 && (
                  <div className="wizard-step-2">
                    <h6 className="mb-3 service-headings">
                      Configure {PLATFORM_FIELDS[currentPlatformKey].label}
                    </h6>
                    <div className="row g-2">
                      {PLATFORM_FIELDS[currentPlatformKey].fields.map((f) => (
                        <div className="col-md-6" key={f}>
                          <label className="form-label text-capitalize">
                            {f}
                          </label>
                          <input
                            className="form-control"
                            value={currentPlatformData[f]}
                            onChange={(e) =>
                              updatePlatformField(
                                currentPlatformKey,
                                f,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handlePlatformBack}
                      >
                        Back
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handlePlatformNext}
                      >
                        {platformIndex < selectedPlatforms.length - 1
                          ? "Next Platform"
                          : "Finish"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Summary */}
                {step === 3 && (
                  <div>
                    <h5 className="mb-3">Summary</h5>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>Brand:</strong> {brandName || "-"} |{" "}
                        <strong>Industry:</strong> {industry || "-"}
                      </div>
                      <button className="invite-btn" onClick={() => setStep(1)}>
                        <i className="bi bi-pencil-square me-1"></i> Edit
                      </button>
                    </div>

                    <div className="mb-3">
                      <strong>Services:</strong>{" "}
                      {selectedServices.length > 0
                        ? selectedServices.join(", ")
                        : "-"}
                    </div>

                    {serviceData.map((s) => (
                      <div
                        key={s.serviceId}
                        className="border p-3 mb-3 rounded "
                      >
                        <strong className="service-headings mb-3">
                          {SERVICES.find((sv) => sv.id === s.serviceId)?.name}
                        </strong>
                        {Object.keys(s)
                          .filter((k) => k !== "serviceId")
                          .map((f) => (
                            <div key={f} className="results-bx">
                              <span className="text-capitalize fw-semibold">
                                {f}:
                              </span>{" "}
                              {s[f] || "-"}
                            </div>
                          ))}
                      </div>
                    ))}

                    {platformData.length > 0 && (
                      <>
                        <h6>Social Media Platforms</h6>
                        {platformData.map((p) => (
                          <div
                            key={p.platformKey}
                            className="border p-3 mb-3 rounded"
                          >
                            <strong className="service-headings mb-3">
                              {p.label}
                            </strong>
                            {PLATFORM_FIELDS[p.platformKey].fields.map((f) => (
                              <div key={f} className="results-bx">
                                <span className="text-capitalize fw-semibold mt-2">
                                  {f}:
                                </span>{" "}
                                {p[f] || "-"}
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    <div className="mt-3 d-flex justify-content-end gap-2">
                      <button
                        className="btn cancel-btn text-dark"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                      <button
                        className="btn invite-btn"
                        onClick={handleSubmitAll}
                      >
                        <i className="bi bi-check2-circle me-1"></i> Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
