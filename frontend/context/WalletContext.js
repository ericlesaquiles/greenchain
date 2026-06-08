import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

const WalletContext = createContext({
  address: null,
  provider: null,
  signer: null,
  error: null,
  loading: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reconnect automatically if wallet was already connected
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts.length > 0) connect();
      });
  }, []);

  async function connect() {
    setError(null);
    setLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install it.");
      }
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);

      // Make sure we're on Sepolia (chainId 11155111)
      const network = await web3Provider.getNetwork();
      if (network.chainId !== 11155111n) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      }

      const web3Signer = await web3Provider.getSigner();
      const web3Address = await web3Signer.getAddress();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(web3Address);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    setAddress(null);
    setProvider(null);
    setSigner(null);
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        provider,
        signer,
        error,
        loading,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
