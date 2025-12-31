"use client"; // for Next.js App Router

import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { toast } from "react-toastify"; // assuming you're using toast too
import React from "react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import DateTimeGreeting from "./DateTimeGreeting";

export default function Dashnav() {
  const router = useRouter();

  const handleLogout = () => {
    confirmAlert({
      title: "Confirm Logout",
      message: "Are you sure you want to logout?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              const res = await fetch("/api/admin/logout", {
                method: "GET",
              });

              if (res.ok) {
                localStorage.removeItem("token"); // Optional: remove token
                toast.success("Logged out successfully.");
                window.location.href = "/dashboard/login";
              } else {
                toast.error("Logout failed.");
                console.error("Logout failed");
              }
            } catch (error) {
              toast.error("An error occurred during logout.");
              console.error("Logout error:", error);
            }
          },
        },
        {
          label: "No",
          onClick: () => {
            toast.info("Logout cancelled.");
          },
        },
      ],
    });
  };

  return (
    <div className="main-nav dash-nav">
      <nav className="navbar">
        <div className="main-container">
          <div className="col-12">
            <div className="navbar-header">
              <Link href="#" className="bars"></Link>
              <Link className="navbar-brand" href="/">
                <img src="/assets/images/logo.png" width="100" alt="Viralon" />
                {/* <span className="m-l-10">Compass</span> */}
              </Link>
            </div>

            <ul className="nav navbar-nav navbar-left">
              {/* <DateTimeGreeting/> */}
            </ul>

            <ul className="nav navbar-nav navbar-right mobile-none">
              {/* <li>
              <a
                href="#"
                className="fullscreen hidden-sm-down"
                data-provide="fullscreen"
                data-close="true"
              >
                <i className="zmdi zmdi-fullscreen"></i>
              </a>
            </li> */}
              {/* <li className="log-out-btn">
              <button onClick={handleLogout}  className="mega-menu" data-close="true">
                <i className="zmdi zmdi-power"></i>
              </button>
            </li> */}


            <li className="log-out-btn">
              <img src="/assets/images/admin/admin-logo.svg"></img>
            </li>

              {/* <li className="log-out-btn">
                <button
                  onClick={handleLogout}
                  className="mega-menu"
                  data-close="true"
                  title="Logout"
                >
                  <i className="zmdi zmdi-power"></i>
                </button>
              </li> */}

              <li>
                {/* <a href="#" className="js-right-sidebar" data-close="true" data-bs-toggle="offcanvas"
               data-bs-target="#invoiceSettings">
                <i className="zmdi zmdi-settings zmdi-hc-spin"></i>
              </a> */}

                {/* <a href="#" className="js-right-sidebar setting-bx">
                <i className="zmdi zmdi-settings zmdi-hc-spin text-white"></i>
              </a> */}
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
