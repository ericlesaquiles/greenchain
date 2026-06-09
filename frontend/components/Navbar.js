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
    { href: "/governance", label: "Governance" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="nav">
      {navLinks.map((link) => {
        const isActive = router.pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${isActive ? "nav-link--active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
