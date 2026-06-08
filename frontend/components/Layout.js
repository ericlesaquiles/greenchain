import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="layout-container">
      <Navbar />
      <main className="layout-content">{children}</main>
      <Footer />
    </div>
  );
}
