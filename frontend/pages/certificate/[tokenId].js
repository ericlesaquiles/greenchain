import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI, SBT_ADDRESS, SBT_ABI, WASTE_CATEGORIES, DEPLOY_BLOCK } from "../../lib/contracts";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export default function Certificate() {
  const router = useRouter();
  const { tokenId } = router.query;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!tokenId) return;
    loadCertificate();
  }, [tokenId]);

  async function loadCertificate() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
      const sbt = new ethers.Contract(SBT_ADDRESS, SBT_ABI, provider);

      const discardId = await sbt.tokenToDiscard(tokenId);
      const discard = await registry.getDiscard(discardId);
      const owner = await sbt.ownerOf(tokenId);
      const locked = await sbt.locked(tokenId);

      // Fetch photo URL from IPFS metadata
      let photoUrl = null;
      let metadataUrl = null;
      try {
        metadataUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${discard.ipfsCid}`;
        const res = await fetch(metadataUrl);
        const metadata = await res.json();
        photoUrl = metadata.photo?.url ?? null;
      } catch (err) {
        console.warn("Could not fetch IPFS metadata");
      }

      setCert({
        tokenId: tokenId.toString(),
        discardId: discardId.toString(),
        owner,
        locked,
        operator: discard.operator,
        category: WASTE_CATEGORIES[Number(discard.category)]?.label ?? "Unknown",
        weightKg: Number(discard.weightKg),
        ipfsCid: discard.ipfsCid,
        timestamp: Number(discard.timestamp),
        photoUrl,
        metadataUrl,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Certificate not found or could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  const categoryColor = {
    Plastic: "#3b82f6",
    Paper: "#f59e0b",
    Metal: "#6b7280",
    Glass: "#06b6d4",
    Organic: "#22c55e",
  };

  if (loading) {
    return (
      <div style={s.container}>
        <p style={s.subtitle}>Loading certificate...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={s.container}>
        <p style={s.error}>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div style={s.container}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerBadge}>GreenChain Certificate</div>
        <h1 style={s.title}>Recycling Certificate</h1>
        <p style={s.subtitle}>
          This certificate is permanently recorded on the Ethereum blockchain
          and cannot be transferred or revoked.
        </p>
      </div>

      {/* ── Certificate card ── */}
      <div style={s.card}>

        {/* Photo */}
        {cert.photoUrl && (
          <img src={cert.photoUrl} alt="Evidence" style={s.photo} />
        )}

        {/* Category badge */}
        <div style={s.cardTop}>
          <span style={{
            ...s.badge,
            background: (categoryColor[cert.category] ?? "#22c55e") + "22",
            color: categoryColor[cert.category] ?? "#22c55e",
            border: `1px solid ${(categoryColor[cert.category] ?? "#22c55e")}55`,
          }}>
            {cert.category}
          </span>
          <span style={s.tokenId}>Token #{cert.tokenId}</span>
        </div>

        {/* Details */}
        <div style={s.details}>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Weight recycled</span>
            <span style={s.detailValue}>{cert.weightKg} kg</span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Date</span>
            <span style={s.detailValue}>
              {new Date(cert.timestamp * 1000).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric"
              })}
            </span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Certificate holder</span>
            <span style={{...s.detailValue, ...s.mono}}>{cert.owner}</span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Registered by</span>
            <span style={{...s.detailValue, ...s.mono}}>{cert.operator}</span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Discard ID</span>
            <span style={s.detailValue}>#{cert.discardId}</span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailLabel}>Soulbound</span>
            <span style={{...s.detailValue, color: "#86efac"}}>
              {cert.locked ? "Yes — non-transferable" : "No"}
            </span>
          </div>
        </div>

        {/* Verification links */}
        <div style={s.links}>
          <a
            style={s.linkBtn}
            href={`https://sepolia.etherscan.io/token/${SBT_ADDRESS}?a=${cert.tokenId}`}
            target="_blank"
            rel="noreferrer"
          >
            Verify on Etherscan →
          </a>
          {cert.photoUrl && (
            <a
              style={s.linkBtn}
              href={cert.photoUrl}
              target="_blank"
              rel="noreferrer"
            >
              View photo evidence →
            </a>
          )}
          {cert.metadataUrl && (
            <a
              style={{...s.linkBtn, ...s.linkBtnSecondary}}
              href={cert.metadataUrl}
              target="_blank"
              rel="noreferrer"
            >
              View full metadata →
            </a>
          )}
        </div>

      </div>

      {/* ── Share ── */}
      <div style={s.shareBox}>
        <p style={s.shareLabel}>Share this certificate</p>
        <div style={s.shareRow}>
          <code style={s.shareUrl}>
            {typeof window !== "undefined" ? window.location.href : ""}
          </code>
          <button style={s.copyBtn} onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}>
            Copy
          </button>
        </div>
      </div>

    </div>
  );
}

const s = {
  container: {
    maxWidth: "600px",
    margin: "60px auto",
    padding: "0 24px 80px",
    fontFamily: "system-ui, sans-serif",
    color: "#f0f0f0",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  headerBadge: {
    display: "inline-block",
    background: "#052e16",
    color: "#86efac",
    border: "1px solid #166534",
    borderRadius: "20px",
    padding: "4px 14px",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "16px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    marginBottom: "8px",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: "15px",
    color: "#aaa",
    lineHeight: "1.6",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  photo: {
    width: "100%",
    maxHeight: "280px",
    objectFit: "cover",
    display: "block",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #2a2a2a",
  },
  badge: {
    padding: "4px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  tokenId: {
    fontSize: "13px",
    color: "#666",
  },
  details: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },
  detailLabel: {
    fontSize: "13px",
    color: "#888",
    flexShrink: 0,
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#f0f0f0",
    textAlign: "right",
    wordBreak: "break-all",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: "12px",
  },
  links: {
    padding: "16px 20px",
    borderTop: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  linkBtn: {
    display: "block",
    padding: "10px 16px",
    background: "#22c55e",
    color: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center",
  },
  linkBtnSecondary: {
    background: "transparent",
    color: "#4ade80",
    border: "1px solid #166534",
  },
  shareBox: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
  },
  shareLabel: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "10px",
  },
  shareRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  shareUrl: {
    flex: 1,
    fontSize: "12px",
    color: "#aaa",
    background: "#111",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #333",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  },
  copyBtn: {
    padding: "8px 16px",
    background: "#2a2a2a",
    color: "#f0f0f0",
    border: "1px solid #444",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    flexShrink: 0,
  },
  error: {
    color: "#f87171",
    fontSize: "14px",
    background: "#450a0a",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #991b1b",
  },
};
