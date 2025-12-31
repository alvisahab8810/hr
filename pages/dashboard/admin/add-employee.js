import AddEmployeeForm from "@/components/admin/AddEmployeeForm";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React from "react";
import Head from "next/head";
import Link from "next/link";

export default function addEmployee() {
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
      <div className="add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />
          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg"></img> Add New Employee
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <AddEmployeeForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
