import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../lib/useWallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI, SBT_ADDRESS, SBT_ABI, WASTE_CATEGORIES } from "../lib/contracts";

export default function Wallet() {
  const { address, signer, error: walletError, loading: walletLoading, connect } = useWallet();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [totalKg, setTotalKg] = useState(0);

  useEffect(() => {
    if (!address || !signer) return;
    loadCertificates();
  }, [address, signer]);

  async function loadCertificates() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const sbt = new ethers.Contract(SBT_ADDRESS, SBT_ABI, signer);

      // Get all token IDs owned by this citizen
      const tokenIds = await sbt.getTokensByCitizen(address);

      if (tokenIds.length === 0) {
        setCertificates([]);
        setTotalKg(0);
        setLoading(false);
        return;
      }

      const certs = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const discardId = await sbt.tokenToDiscard(tokenId);
          const discard = await registry.getDiscard(discardId);

          // Fetch metadata from IPFS to get the direct photo URL
          let photoUrl = null;
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${discard.ipfsCid}`
            );
            const metadata = await res.json();
            photoUrl = metadata.photo?.url ?? null;
          } catch (err) {
            console.warn("Could not fetch IPFS metadata for token", tokenId.toString());
          }

          return {
            tokenId: tokenId.toString(),
            discardId: discardId.toString(),
            operator: discard.operator,
            category: WASTE_CATEGORIES[Number(discard.category)]?.label ?? "Unknown",
            weightKg: Number(discard.weightKg),
            ipfsCid: discard.ipfsCid,
            photoUrl,
            timestamp: Number(discard.timestamp),
          };
        })
      );

      // Sort by most recent first
      certs.sort((a, b) => b.timestamp - a.timestamp);

      const kg = certs.reduce((sum, c) => sum + c.weightKg, 0);
      setCertificates(certs);
      setTotalKg(kg);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>My Certificates</h1>
        <p style={s.subtitle}>Connect your wallet to see your recycling history.</p>
        <button style={s.btn} onClick={connect} disabled={walletLoading}>
          {walletLoading ? "Connecting..." : "Connect MetaMask"}
        </button>
        {walletError && <p style={s.error}>{walletError}</p>}
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.container}>
        <h1 style={s.title}>My Certificates</h1>
        <p style={s.subtitle}>Loading your certificates...</p>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  return (
    <div style={s.container}>
      <h1 style={s.title}>My Certificates</h1>
      <p style={s.subtitle}>
        Wallet: <code style={s.code}>{address}</code>
      </p>

      {errorMsg && <p style={s.error}>{errorMsg}</p>}

      {/* ── Summary bar ── */}
      {certificates.length > 0 && (
        <div style={s.summaryBar}>
          <div style={s.summaryItem}>
            <span style={s.summaryValue}>{certificates.length}</span>
            <span style={s.summaryLabel}>certificates</span>
          </div>
          <div style={s.summaryDivider} />
          <div style={s.summaryItem}>
            <span style={s.summaryValue}>{totalKg} kg</span>
            <span style={s.summaryLabel}>total recycled</span>
          </div>
          <div style={s.summaryDivider} />
          <div style={s.summaryItem}>
            <span style={s.summaryValue}>
              {[...new Set(certificates.map((c) => c.category))].length}
            </span>
            <span style={s.summaryLabel}>categories</span>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {certificates.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyText}>No certificates yet.</p>
          <p style={s.subtitle}>
            When an operator registers a discard for your address, your certificate will appear here.
          </p>
        </div>
      )}

      {/* ── Certificate cards ── */}
      <div style={s.cardList}>
        {certificates.map((cert) => (
          <div key={cert.tokenId} style={s.card}>

            <div style={s.cardHeader}>
              <span style={s.badge}>{cert.category}</span>
              <span style={s.cardDate}>
                {new Date(cert.timestamp * 1000).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </span>
            </div>

            <div style={s.cardBody}>
              <div style={s.cardRow}>
                <span style={s.cardLabel}>Weight</span>
                <span style={s.cardValue}>{cert.weightKg} kg</span>
              </div>
              <div style={s.cardRow}>
                <span style={s.cardLabel}>Token ID</span>
                <span style={s.cardValue}>#{cert.tokenId}</span>
              </div>
              <div style={s.cardRow}>
                <span style={s.cardLabel}>Discard ID</span>
                <span style={s.cardValue}>#{cert.discardId}</span>
              </div>
              <div style={s.cardRow}>
                <span style={s.cardLabel}>Operator</span>
                <span style={{...s.cardValue, ...s.mono}}>
                  {cert.operator.slice(0, 6)}...{cert.operator.slice(-4)}
                </span>
              </div>
            </div>
            <div style={s.cardFooter}>
              {cert.photoUrl && (
                <a
                  style={s.link}
                  href={cert.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View photo evidence →
                </a>
              )}
              <a
                style={{...s.link, marginLeft: cert.photoUrl ? "16px" : "0"}}
                href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${cert.ipfsCid}`}
                target="_blank"
                rel="noreferrer"
              >
                View full metadata →
              </a>
            </div>

          </div>
        ))}
      </div>

      <button style={s.refreshBtn} onClick={loadCertificates}>
        Refresh
      </button>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: "600px",
    margin: "60px auto",
    padding: "0 24px",
    fontFamily: "system-ui, sans-serif",
    color: "#f0f0f0",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#aaa",
    marginBottom: "24px",
  },
  code: {
    background: "#2a2a2a",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    wordBreak: "break-all",
    color: "#f0f0f0",
  },
  btn: {
    padding: "12px 24px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  refreshBtn: {
    marginTop: "24px",
    padding: "10px 20px",
    background: "#1a1a1a",
    color: "#aaa",
    border: "1px solid #444",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  error: {
    color: "#f87171",
    fontSize: "14px",
    background: "#450a0a",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #991b1b",
    marginBottom: "16px",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    background: "#052e16",
    border: "1px solid #166534",
    borderRadius: "12px",
    padding: "20px 24px",
    marginBottom: "32px",
    gap: "24px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#86efac",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#6ee7b7",
    marginTop: "4px",
  },
  summaryDivider: {
    width: "1px",
    height: "40px",
    background: "#166534",
  },
  emptyBox: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
  },
  emptyText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#aaa",
    marginBottom: "8px",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #2a2a2a",
    background: "#111",
  },
  badge: {
    background: "#052e16",
    color: "#86efac",
    border: "1px solid #166534",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "13px",
    fontWeight: "600",
  },
  cardDate: {
    fontSize: "13px",
    color: "#888",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: "13px",
    color: "#888",
  },
  cardValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#f0f0f0",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: "13px",
  },
  cardFooter: {
    padding: "12px 16px",
    borderTop: "1px solid #2a2a2a",
    background: "#111",
  },
  link: {
    color: "#4ade80",
    fontSize: "14px",
    textDecoration: "none",
  },
};
