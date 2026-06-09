import Link from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "../context/WalletContext";

const ADMIN_ADDRESS = "0x002C1C13E35F56a903c9C1C93796409d9478dDF0";

export default function Navbar() {
  const router = useRouter();
  const { address } = useWallet();

  const isAdmin =
    address && address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/register", label: "Register" },
    { href: "/certificates", label: "My Certificates" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const govActive = router.pathname === "/governance" || router.pathname.startsWith("/governance/");
  const adminActive = router.pathname === "/admin";

  return (
    <nav className="nav">
      {/* ── Standard links ── */}
      {navLinks.map((link) => {
        const active =
          link.href === "/"
            ? router.pathname === "/"
            : router.pathname === link.href || router.pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${active ? " nav-link--active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}

      {/* ── Governance (indigo accent) ── */}
      <Link
        href="/governance"
        className={`nav-link--governance ${govActive ? "nav-link--governance-active" : ""}`}
      >
        Governance
      </Link>

      {/* ── Admin (red, far right) ── */}
      {isAdmin && (
        <Link
          href="/admin"
          className={`nav-link--admin ${adminActive ? "nav-link--admin-active" : ""}`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
