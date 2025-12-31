"use client"; // for Next.js App Router

import "react-confirm-alert/src/react-confirm-alert.css";
import React from "react";
import Link from "next/link";

import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();


  return (
    <div className="main-nav dash-nav">
      <nav className="navbar">
        <div className="col-12">
          <div className="navbar-header ">
            <Link href="#" className="bars"></Link>
            <Link className="navbar-brand" href="#">
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
      </nav>
    </div>
  );
}
