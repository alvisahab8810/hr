// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function EmployeeLoginForm() {
//   const router = useRouter();

//   const [formData, setFormData] = useState({
//     employeeId: "",
//     password: "",
//   });

//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState(null);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage(null);

//     try {
//       const res = await fetch("/api/employee/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });

//       const data = await res.json();

//       if (data.success) {
//         // Save token (optional: use cookies/localStorage)
//         localStorage.setItem("employeeToken", data.token);

//         // Redirect
//         router.push(data.redirectUrl);
//       } else {
//         setMessage({ type: "danger", text: data.message || "Invalid credentials" });
//       }
//     } catch (err) {
//       setMessage({ type: "danger", text: "Server error. Try again later." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container d-flex align-items-center justify-content-center vh-100">
//       <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
//         <div className="card-body">
//           <h3 className="card-title text-center mb-4">Employee Login</h3>
//           <form onSubmit={handleSubmit}>
//             {/* Employee ID */}
//             <div className="mb-3">
//               <label className="form-label">Employee ID</label>
//               <input
//                 type="text"
//                 name="employeeId"
//                 value={formData.employeeId}
//                 onChange={handleChange}
//                 className="form-control"
//                 placeholder="Enter your Employee ID"
//                 required
//               />
//             </div>

//             {/* Password */}
//             <div className="mb-3">
//               <label className="form-label">Password</label>
//               <input
//                 type="password"
//                 name="password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 className="form-control"
//                 placeholder="Enter your password"
//                 required
//               />
//             </div>

//             {/* Login button */}
//             <div className="d-grid">
//               <button type="submit" className="btn btn-primary" disabled={loading}>
//                 {loading ? "Logging in..." : "Login"}
//               </button>
//             </div>

//             {/* Message */}
//             {message && (
//               <div className={`alert alert-${message.type} mt-3`}>{message.text}</div>
//             )}
//           </form>
//         </div>
//         <div className="card-footer text-muted text-center" style={{ fontSize: "0.85rem" }}>
//           &copy; {new Date().getFullYear()} Viralon HR
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Install react-icons if not already
export default function EmployeeLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    employeeId: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

//  const handleSubmit = async (e) => {
//   e.preventDefault();
//   setLoading(true);
//   setMessage(null);

//   try {
//     const res = await fetch("/api/employee/login", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(formData),
//       credentials: "include", // 🔑 ensure authToken cookie is saved
//     });

//     const data = await res.json();

//     if (data.success) {
//       // ✅ No need to save token manually, cookie is already set
//       // Redirect based on profile completion
//       if (data.profileCompleted) {
//         router.push("/employee/dashboard");
//       } else {
//         router.push("/employee/complete-profile");
//       }
//     } else {
//       setMessage({
//         type: "danger",
//         text: data.message || "Invalid credentials",
//       });
//     }
//   } catch (err) {
//     setMessage({ type: "danger", text: "Server error. Try again later." });
//   } finally {
//     setLoading(false);
//   }
// };



    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // Save token
        localStorage.setItem("employeeToken", data.token);

        // ✅ Redirect based on profile completion
        if (data.profileCompleted) {
          router.push("/employee/profile");
        } else {
          router.push("/employee/complete-profile");
        }
      } else {
        setMessage({
          type: "danger",
          text: data.message || "Invalid credentials",
        });
      }
    } catch (err) {
      setMessage({ type: "danger", text: "Server error. Try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="row g-0 h-100">
        {/* Left Image Section */}
        <div className="col-md-8 d-none d-md-block login-image"></div>

        {/* Right Login Form */}
        <div className="col-md-4 d-flex align-items-center justify-content-center bg-white">
          <div className="login-form p-4 w-100" style={{ maxWidth: "400px" }}>
            {/* Logo */}
            <div className="text-center mb-4">
              <img
                src="/assets/images/logo.png"
                alt="Viralon"
                width="150"
                className="mb-2"
              />
              <h4 className="fw-bold text-dark mb-0">Welcome To Our Team</h4>
              <p className="text-muted small mt-0 ">Please login here</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Employee ID */}
              <div className="mb-3 custom-input">
                <label className="form-label fw-semibold text-dark">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter your Employee ID"
                  required
                />
              </div>

              {/* Password */}
              {/* <div className="mb-3 custom-input">
                <label className="form-label fw-semibold text-dark">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter your password"
                  required
                />
              </div> */}

              {/* Password */}
              <div className="mb-3 position-relative p-relative custom-input">
                <label className="form-label fw-semibold text-dark">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control pe-5"
                  placeholder="Enter your password"
                  required
                />
                {/* Eye button inside input */}
                <span
                  className="eye-viewer"
                  style={{ cursor: "pointer", color: "#6c757d" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {/* Remember Me */}
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberMe"
                />
                <label
                  className="form-check-label small text-dark"
                  htmlFor="rememberMe"
                >
                  Remember Me
                </label>
              </div>

              {/* Login button */}
              <div className="d-grid mb-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>

              {/* Message */}
              {message && (
                <div className={`alert alert-${message.type} small`}>
                  {message.text}
                </div>
              )}
            </form>

            <div className="text-center text-muted small mt-4">
              &copy; {new Date().getFullYear()} Viralon HR
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          height: 100vh;
          overflow: hidden;
        }
        .login-image {
          background: url("/asets/images/login.webp") no-repeat center center;
          background-size: cover;
        }
        .btn-primary {
          background: #7152f3;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          padding: 15px 0;
        }
        .btn-primary:hover {
          opacity: 0.9;
        }

        .login-container form .custom-input input {
          height: 45px;
          border-radius: 10px;
          border: 1px solid #7152f3;
          background: transparent;
        }

        .login-container form .custom-input input::placeholder {
          color: #a2a1a8 !important;
        }

        .login-container form .form-check-input:checked {
          background-color: #7152f3;
          border-color: #7152f3;
        }

        .login-container form .alert {
          border-radius: 10px;
        }

        .eye-viewer {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translate(-10%, 12%);
        }
      `}</style>
    </div>
  );
}
