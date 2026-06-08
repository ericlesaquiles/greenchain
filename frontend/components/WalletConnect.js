import { useWallet } from "../context/WalletContext";

export default function WalletConnect({ title, subtitle, buttonSize = "md" }) {
  const { connect, error: walletError, loading: walletLoading } = useWallet();

  const buttonClass =
    buttonSize === "full"
      ? "btn-primary--full"
      : buttonSize === "lg"
      ? "btn-primary--lg"
      : "btn-primary--md";

  return (
    <div>
      {title && <h1 className="page-title">{title}</h1>}
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      <button
        className={`btn btn-primary ${buttonClass}`}
        onClick={connect}
        disabled={walletLoading}
      >
        {walletLoading ? "Connecting..." : "Connect MetaMask"}
      </button>
      {walletError && (
        <p className="alert-error" style={{ marginTop: "16px" }}>
          {walletError}
        </p>
      )}
    </div>
  );
}
