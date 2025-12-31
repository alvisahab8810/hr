






// // pages/employee/login.js
// import { useState, useEffect } from "react";
// import { useRouter } from "next/router";
// import { FaEnvelope, FaSignInAlt } from "react-icons/fa";

// export default function EmployeeLogin() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (router.query.email) {
//       setEmail(decodeURIComponent(router.query.email));
//     }
//   }, [router.query.email]);

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     const res = await fetch("/api/payroll/employee-login", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ email }),
//     });

//     const data = await res.json();
//     if (data.success) {
//       router.push("/employee/dashboard");
//     } else {
//       setError(data.message || "Login failed.");
//     }
//   };

//   return (
//     <div className="login-page d-flex align-items-center justify-content-center">
//       <div className="login-wrapper text-center">
//         {/* Logo */}
//         <a className="login-logo d-block mb-4" href="/">
//           <img src="/assets/images/logo.png" alt="Viralon" />
//         </a>

//         {/* Card */}
//         <div className="card login-card shadow-lg p-4 border-0">
//           <h3 className="text-center mb-3 fw-bold text-dark">
//             Employee Login
//           </h3>
//           <p className="text-muted small mb-4">
//             Please enter your registered email to continue
//           </p>

//           <form onSubmit={handleLogin}>
//             <div className="mb-3 text-start">
//               <label className="form-label fw-semibold">Email Address</label>
//               <div className="input-group">
//                 <span className="input-group-text">
//                   <FaEnvelope />
//                 </span>
//                 <input
//                   type="email"
//                   className="form-control"
//                   value={email}
//                   required
//                   onChange={(e) => setEmail(e.target.value)}
//                   readOnly={!!router.query.email}
//                   placeholder="Enter your email"
//                 />
//               </div>
//             </div>

//             {error && (
//               <div className="alert alert-danger py-2 small text-center">
//                 {error}
//               </div>
//             )}

//             <button
//               className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
//               type="submit"
//             >
//               <FaSignInAlt /> Login
//             </button>
//           </form>
//         </div>

//         {/* Footer Note */}
//         <p className="mt-4 text-muted small">
//           © {new Date().getFullYear()} Viralon. All Rights Reserved.
//         </p>
//       </div>

//       <style jsx>{`
//         .login-page {
//           min-height: 100vh;
//           // background: linear-gradient(135deg, #f3f4f7, #dce3f0);
//           padding: 20px;
//         }
//         .login-wrapper {
//           max-width: 420px;
//           width: 100%;
//         }
//         .login-logo img {
//           width: 140px;
//           margin-bottom:20px;
//         }
//         .login-card {
//           border-radius: 16px;
//         }
//         .form-label {
//           font-size: 0.9rem;
//         }
//         .input-group-text {
//           background: #f8f9fa;
//           border-right: none;
//         }
//         .form-control {
//           border-left: none;
//         }
//         .btn-primary {
//           background: linear-gradient(190deg, #5a57fb 40%, #02ebad 100%);
//           border: none;
//           border-radius: 8px;
//           font-weight: 600;
//           padding: 10px 0;
//           transition: transform 0.2s ease;
//         }
//         .btn-primary:hover {
//           transform: translateY(-1px);
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//         }
//       `}</style>
//     </div>
//   );
// }




import EmployeeLoginForm from '@/components/employee/LoginForm'
import React from 'react'

export default function login() {
  return (
    <div className='emp-login-area'>
        <EmployeeLoginForm/>
    </div>
  )
}







