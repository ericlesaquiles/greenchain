import "../styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <>
      <nav style={{
        padding: "16px 32px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        gap: "24px",
        fontSize: "15px",
      }}>
        <Link href="/" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
          Home
        </Link>
        <Link href="/register" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
          Register
        </Link>
	<Link href="/certificates" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
	  My Certificates
	</Link>
        <Link href="/dashboard" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>
          Dashboard
        </Link>
      </nav>
      <Component {...pageProps} />
    </>
  );
}
