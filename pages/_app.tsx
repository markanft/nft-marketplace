import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import Header from "@components/Header";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
