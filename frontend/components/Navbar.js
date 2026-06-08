import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/register", label: "Register" },
    { href: "/certificates", label: "My Certificates" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/admin", label: "Admin" },
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
