
import React, { useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


import { signIn } from "next-auth/react";
// import { useRouter } from "next/router";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      toast.success("Login successful!");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } else {
      toast.error("Invalid credentials");
    }
  };





// const handleSubmit = async (e) => {
//   e.preventDefault();

//   const res = await signIn("credentials", {
//     email: username,   // ✅ map username → email
//     password: password,
//     redirect: false,
//   });

//   if (res?.error) {
//     alert("Invalid email or password");
//   } else {
//     router.push("/dashboard/admin/attendance-summary");
//   }
// };

  return (
    <div className="login-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <title>Admin Login</title>
      </Head>

      <div className="theme-cyan authentication sidebar-collapse">
        {/* NAVBAR */}
        <nav className="navbar navbar-expand-lg fixed-top navbar-transparent">
          <div className="container">
            <div className="navbar-translate n_logo">
              <Link className="navbar-brand" href="/" title="Viralon Logo">
                <img src="/assets/images/logo.png" alt="Viralon" width={120} />
              </Link>
              <button className="navbar-toggler" type="button">
                <span className="navbar-toggler-bar bar1"></span>
                <span className="navbar-toggler-bar bar2"></span>
                <span className="navbar-toggler-bar bar3"></span>
              </button>
            </div>
          </div>
        </nav>

        {/* LOGIN CARD */}
        <div className="page-header">
          <div
            className="page-header-image"
            style={{ backgroundImage: "url(/assets/images/login.jpg)" }}
          ></div>

          <div className="container">
            <div className="col-md-12 content-center">
              <div className="card-plain">
                <form onSubmit={handleSubmit} className="form">
                  <div className="header">
                    <h5>Admin Login</h5>
                  </div>

                  <div className="content">
                    {/* USERNAME */}
                    <div className="input-group input-lg">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter User Name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                      <span className="input-group-addon">
                        <i className="zmdi zmdi-account-circle"></i>
                      </span>
                    </div>

                    {/* PASSWORD */}
                    <div className="input-group input-lg">
                      <input
                        type="password"
                        placeholder="Password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <span className="input-group-addon">
                        <i className="zmdi zmdi-lock"></i>
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="footer text-center">
                    <button
                      type="submit"
                      className="btn l-cyan btn-round btn-lg btn-block waves-effect waves-light"
                    >
                      SIGN IN
                    </button>

                
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer className="footer">
            <div className="container">
              <nav>
                <ul>
                  <li>
                    <Link href="#">Contact Us</Link>
                  </li>
                  <li>
                    <Link href="#">About Us</Link>
                  </li>
                  <li>
                    <Link href="#">FAQ</Link>
                  </li>
                </ul>
              </nav>
              <div className="copyright">
                <span>
                  Designed by{" "}
                  <Link href="#" target="_blank">
                    Viralon
                  </Link>
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={1000} />
    </div>
  );
}