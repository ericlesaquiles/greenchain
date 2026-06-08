import "../styles/globals.css";
import { WalletProvider } from "../context/WalletContext";
import Layout from "../components/Layout";

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </WalletProvider>
  );
}
