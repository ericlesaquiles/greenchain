import Link from "next/link";

export default function Home() {
  return (
    <div style={s.container}>

      {/* ── Hero ── */}
      <div style={s.hero}>
        <div style={s.badge}>Powered by Ethereum · Sepolia Testnet</div>
        <h1 style={s.title}>GreenChain</h1>
        <p style={s.tagline}>
          Verified recycling actions, permanently recorded on the blockchain.
        </p>
        <p style={s.description}>
          GreenChain transforms recycling into verifiable proof. Every discard
          action is registered on-chain, linked to photographic evidence on IPFS,
          and certified with a soulbound token — creating an auditable trail that
          citizens, operators, and the public can trust.
        </p>
      </div>

      {/* ── Cards ── */}
      <div style={s.cardRow}>

        <div style={s.card}>
          <div style={s.cardIcon}>♻️</div>
          <h2 style={s.cardTitle}>Register a discard</h2>
          <p style={s.cardText}>
            Operators can register recycling actions with photographic evidence.
            Each action is recorded on-chain and issues a certificate to the citizen.
          </p>
          <Link href="/register" style={s.btn}>
            Go to Register →
          </Link>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>🏅</div>
          <h2 style={s.cardTitle}>My certificates</h2>
          <p style={s.cardText}>
            Citizens can view their full recycling history, total kg recycled,
            and access the on-chain proof for each action.
          </p>
          <Link href="/certificates" style={s.btn}>
            View My Certificates →
          </Link>
        </div>

        <div style={s.card}>
          <div style={s.cardIcon}>📊</div>
          <h2 style={s.cardTitle}>Impact dashboard</h2>
          <p style={s.cardText}>
            Anyone can audit the full history of recycling actions, explore
            metrics by category, and verify each record on Etherscan and IPFS.
          </p>
          <Link href="/dashboard" style={s.btn}>
            View Dashboard →
          </Link>
        </div>

      </div>

      {/* ── How it works ── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>How it works</h2>
        <div style={s.steps}>

          <div style={s.step}>
            <div style={s.stepNumber}>1</div>
            <div>
              <h3 style={s.stepTitle}>Operator registers the discard</h3>
              <p style={s.stepText}>
                An authorized operator fills in the discard details and attaches
                a photo as evidence. The photo is uploaded to IPFS.
              </p>
            </div>
          </div>

          <div style={s.stepDivider} />

          <div style={s.step}>
            <div style={s.stepNumber}>2</div>
            <div>
              <h3 style={s.stepTitle}>Action is recorded on-chain</h3>
              <p style={s.stepText}>
                The smart contract stores the action details and the IPFS
                evidence hash permanently on the Ethereum blockchain.
              </p>
            </div>
          </div>

          <div style={s.stepDivider} />

          <div style={s.step}>
            <div style={s.stepNumber}>3</div>
            <div>
              <h3 style={s.stepTitle}>Certificate is issued</h3>
              <p style={s.stepText}>
                A soulbound token (SBT) is automatically minted to the citizen's
                wallet — a non-transferable proof of their recycling action.
              </p>
            </div>
          </div>

          <div style={s.stepDivider} />

          <div style={s.step}>
            <div style={s.stepNumber}>4</div>
            <div>
              <h3 style={s.stepTitle}>Anyone can audit</h3>
              <p style={s.stepText}>
                The public dashboard shows all actions. Every record links back
                to its Etherscan transaction and IPFS evidence — fully verifiable
                by anyone, forever.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Contracts ── */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Deployed contracts</h2>
        <div style={s.contractBox}>
          <div style={s.contractRow}>
            <span style={s.contractLabel}>GreenRegistry</span>
            <a
              style={s.contractLink}
              href="https://sepolia.etherscan.io/address/0x7832Eee24EB47af4347825231FE6135d9fe29815#code"
              target="_blank"
              rel="noreferrer"
            >
              0x7832Eee24EB47af4347825231FE6135d9fe29815 →
            </a>
          </div>
          <div style={s.contractDivider} />
          <div style={s.contractRow}>
            <span style={s.contractLabel}>GreenSBT</span>
            <a
              style={s.contractLink}
              href="https://sepolia.etherscan.io/address/0xA55Dbd05D330018E2B600236031Fb5b46758c27c#code"
              target="_blank"
              rel="noreferrer"
            >
              0xA55Dbd05D330018E2B600236031Fb5b46758c27c →
            </a>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        Built for ImpactLedger · Hackweb 2025 · Ethereum Sepolia Testnet
      </div>

    </div>
  );
}

const s = {
  container: {
    maxWidth: "860px",
    margin: "0 auto",
    padding: "60px 24px",
    fontFamily: "system-ui, sans-serif",
    color: "#f0f0f0",
  },
  hero: {
    textAlign: "center",
    marginBottom: "64px",
  },
  badge: {
    display: "inline-block",
    background: "#052e16",
    color: "#86efac",
    border: "1px solid #166534",
    borderRadius: "20px",
    padding: "4px 14px",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  title: {
    fontSize: "52px",
    fontWeight: "800",
    marginBottom: "16px",
    color: "#ffffff",
    letterSpacing: "-1px",
  },
  tagline: {
    fontSize: "20px",
    color: "#86efac",
    marginBottom: "16px",
    fontWeight: "500",
  },
  description: {
    fontSize: "16px",
    color: "#aaa",
    maxWidth: "600px",
    margin: "0 auto",
    lineHeight: "1.7",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "64px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardIcon: {
    fontSize: "32px",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: "600",
    color: "#f0f0f0",
    margin: 0,
  },
  cardText: {
    fontSize: "14px",
    color: "#888",
    lineHeight: "1.6",
    flex: 1,
    margin: 0,
  },
  btn: {
    display: "inline-block",
    marginTop: "8px",
    padding: "10px 16px",
    background: "#22c55e",
    color: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    textAlign: "center",
  },
  section: {
    marginBottom: "64px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: "700",
    marginBottom: "24px",
    color: "#e0e0e0",
  },
  steps: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  step: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#052e16",
    border: "1px solid #166534",
    color: "#86efac",
    fontSize: "16px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#f0f0f0",
    margin: "0 0 6px 0",
  },
  stepText: {
    fontSize: "14px",
    color: "#888",
    lineHeight: "1.6",
    margin: 0,
  },
  stepDivider: {
    width: "1px",
    height: "28px",
    background: "#2a2a2a",
    marginLeft: "17px",
  },
  contractBox: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    overflow: "hidden",
  },
  contractRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    gap: "16px",
  },
  contractDivider: {
    height: "1px",
    background: "#2a2a2a",
  },
  contractLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#ccc",
    flexShrink: 0,
  },
  contractLink: {
    fontSize: "13px",
    color: "#4ade80",
    textDecoration: "none",
    fontFamily: "monospace",
    wordBreak: "break-all",
    textAlign: "right",
  },
  footer: {
    textAlign: "center",
    fontSize: "13px",
    color: "#555",
    paddingTop: "40px",
    borderTop: "1px solid #222",
  },
};
