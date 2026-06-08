import "../styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-link">
          Home
        </Link>
        <Link href="/register" className="nav-link">
          Register
        </Link>
        <Link href="/certificates" className="nav-link">
          My Certificates
        </Link>
        <Link href="/dashboard" className="nav-link">
          Dashboard
        </Link>
        <Link href="/admin" className="nav-link">
          Admin
        </Link>
      </nav>
      <Component {...pageProps} />
    </>
  );
}
