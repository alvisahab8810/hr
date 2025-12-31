// import "@/styles/globals.css";

// export default function App({ Component, pageProps }) {
//   return <Component {...pageProps} />;
// }

import "@/styles/globals.css";

import Head from "next/head";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";

// import { Toaster } from "react-hot-toast";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link
          rel="icon"
          type="image/x-icon"
          href="/assets/images/favicon.png"
        />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/admin.css" />
        <link rel="stylesheet" href="/assets/css/main.css" />

        <link rel="stylesheet" href="/assets/css/custome.css" />
        <link rel="stylesheet" href="/assets/css/validnavs.css" />

        <link rel="stylesheet" href="/assets//css/responsive.css" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Icons+Round"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@2.2.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
        />
        <link href="/assets/css/font-awesome.min.css" rel="stylesheet" />
        <link href="/assets/css/magnific-popup.css" rel="stylesheet" />
        <link href="/assets/css/flaticon-set.css" rel="stylesheet" />
        <link href="/assets/css/swiper-bundle.min.css" rel="stylesheet" />
        <link href="/assets/css/animate.min.css" rel="stylesheet" />
        <link href="/assets/css/validnavs.css" rel="stylesheet" />
        <link href="/assets/css/helper.css" rel="stylesheet" />
        <link href="/assets/css/unit-test.css" rel="stylesheet" />

        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
          rel="stylesheet"
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />

        <title>Payroll - Admin Panel</title>
      </Head>
      {/* Non-Critical Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"
        strategy="lazyOnload"
      />
      <Script src="/assets/js/jquery-3.6.0.min.js" defer></Script>

      <Script src="/assets/js/bootstrap.bundle.min.js" defer></Script>

      <SessionProvider session={pageProps.session}>
        <Component {...pageProps} />

         <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
      </SessionProvider>
    </>
  );
}

export default MyApp;
