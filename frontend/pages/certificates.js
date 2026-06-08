import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../lib/useWallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI, SBT_ADDRESS, SBT_ABI, WASTE_CATEGORIES } from "../lib/contracts";
import styles from "../styles/Certificates.module.css";
import WalletConnect from "../components/WalletConnect";

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
      <div className="page-container page-container--medium">
        <WalletConnect
          title="My Certificates"
          subtitle="Connect your wallet to see your recycling history."
          buttonSize="lg"
        />
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container page-container--medium">
        <h1 className="page-title">My Certificates</h1>
        <p className="page-subtitle">Loading your certificates...</p>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  return (
    <div className="page-container page-container--medium">
      <h1 className="page-title">My Certificates</h1>
      <p className="page-subtitle">
        Wallet: <code className="code">{address}</code>
      </p>

      {errorMsg && <p className="alert-error">{errorMsg}</p>}

      {/* ── Summary bar ── */}
      {certificates.length > 0 && (
        <div className={`panel panel--green ${styles.summaryBar}`}>
          <div className={styles.summaryItem}>
            <span className="summary-value">{certificates.length}</span>
            <span className={`summary-label ${styles.summaryLabel}`}>certificates</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className="summary-value">{totalKg} kg</span>
            <span className={`summary-label ${styles.summaryLabel}`}>total recycled</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className="summary-value">
              {[...new Set(certificates.map((c) => c.category))].length}
            </span>
            <span className={`summary-label ${styles.summaryLabel}`}>categories</span>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {certificates.length === 0 && (
        <div className={`panel ${styles.emptyBox}`}>
          <p className={styles.emptyText}>No certificates yet.</p>
          <p className="page-subtitle">
            When an operator registers a discard for your address, your certificate will appear here.
          </p>
        </div>
      )}

      {/* ── Certificate cards ── */}
      <div className={styles.cardList}>
        {certificates.map((cert) => (
          <div key={cert.tokenId} className={`panel ${styles.card}`}>

            <div className={styles.cardHeader}>
              <span className="badge-green">{cert.category}</span>
              <span className={styles.cardDate}>
                {new Date(cert.timestamp * 1000).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </span>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Weight</span>
                <span className={styles.cardValue}>{cert.weightKg} kg</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Token ID</span>
                <span className={styles.cardValue}>#{cert.tokenId}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Discard ID</span>
                <span className={styles.cardValue}>#{cert.discardId}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Operator</span>
                <span className={`${styles.cardValue} mono`}>
                  {cert.operator.slice(0, 6)}...{cert.operator.slice(-4)}
                </span>
              </div>
            </div>
            <div className={styles.cardFooter}>
               <a
                 className="link link--md"
                 href={`/certificate/${cert.tokenId}`}
               >
                 View certificate page →
               </a>
              {cert.photoUrl && (
                <a
                  className="link link--md"
                  href={cert.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View photo evidence →
                </a>
              )}
              <a
                className="link link--md"
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

      <button className={`btn btn-secondary ${styles.refreshSpaced}`} onClick={loadCertificates}>
        Refresh
      </button>
    </div>
  );
}
