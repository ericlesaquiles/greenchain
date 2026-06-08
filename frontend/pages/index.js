import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className="page-container page-container--home">

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className="badge-green badge-green--hero">Powered by Ethereum · Sepolia Testnet</div>
        <h1 className={styles.title}>GreenChain</h1>
        <p className={styles.tagline}>
          Verified recycling actions, permanently recorded on the blockchain.
        </p>
        <p className={styles.description}>
          GreenChain transforms recycling into verifiable proof. Every discard
          action is registered on-chain, linked to photographic evidence on IPFS,
          and certified with a soulbound token — creating an auditable trail that
          citizens, operators, and the public can trust.
        </p>
      </div>

      {/* ── Cards ── */}
      <div className={styles.cardRow}>

        <div className={`panel ${styles.card}`}>
          <div className={styles.cardIcon}>♻️</div>
          <h2 className={styles.cardTitle}>Register a discard</h2>
          <p className={styles.cardText}>
            Operators can register recycling actions with photographic evidence.
            Each action is recorded on-chain and issues a certificate to the citizen.
          </p>
          <Link href="/register" className="btn btn-primary btn-primary--link">
            Go to Register →
          </Link>
        </div>

        <div className={`panel ${styles.card}`}>
          <div className={styles.cardIcon}>🏅</div>
          <h2 className={styles.cardTitle}>My certificates</h2>
          <p className={styles.cardText}>
            Citizens can view their full recycling history, total kg recycled,
            and access the on-chain proof for each action.
          </p>
          <Link href="/certificates" className="btn btn-primary btn-primary--link">
            View My Certificates →
          </Link>
        </div>

        <div className={`panel ${styles.card}`}>
          <div className={styles.cardIcon}>📊</div>
          <h2 className={styles.cardTitle}>Impact dashboard</h2>
          <p className={styles.cardText}>
            Anyone can audit the full history of recycling actions, explore
            metrics by category, and verify each record on Etherscan and IPFS.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-primary--link">
            View Dashboard →
          </Link>
        </div>

      </div>

      {/* ── How it works ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={`panel ${styles.steps}`}>

          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div>
              <h3 className={styles.stepTitle}>Operator registers the discard</h3>
              <p className={styles.stepText}>
                An authorized operator fills in the discard details and attaches
                a photo as evidence. The photo is uploaded to IPFS.
              </p>
            </div>
          </div>

          <div className={styles.stepDivider} />

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div>
              <h3 className={styles.stepTitle}>Action is recorded on-chain</h3>
              <p className={styles.stepText}>
                The smart contract stores the action details and the IPFS
                evidence hash permanently on the Ethereum blockchain.
              </p>
            </div>
          </div>

          <div className={styles.stepDivider} />

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div>
              <h3 className={styles.stepTitle}>Certificate is issued</h3>
              <p className={styles.stepText}>
                A soulbound token (SBT) is automatically minted to the citizen's
                wallet — a non-transferable proof of their recycling action.
              </p>
            </div>
          </div>

          <div className={styles.stepDivider} />

          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <div>
              <h3 className={styles.stepTitle}>Anyone can audit</h3>
              <p className={styles.stepText}>
                The public dashboard shows all actions. Every record links back
                to its Etherscan transaction and IPFS evidence — fully verifiable
                by anyone, forever.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Contracts ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Deployed contracts</h2>
        <div className={`panel ${styles.contractBox}`}>
          <div className={styles.contractRow}>
            <span className={styles.contractLabel}>GreenRegistry</span>
            <a
              className={styles.contractLink}
              href="https://sepolia.etherscan.io/address/0x7832Eee24EB47af4347825231FE6135d9fe29815#code"
              target="_blank"
              rel="noreferrer"
            >
              0x7832Eee24EB47af4347825231FE6135d9fe29815 →
            </a>
          </div>
          <div className={styles.contractDivider} />
          <div className={styles.contractRow}>
            <span className={styles.contractLabel}>GreenSBT</span>
            <a
              className={styles.contractLink}
              href="https://sepolia.etherscan.io/address/0xA55Dbd05D330018E2B600236031Fb5b46758c27c#code"
              target="_blank"
              rel="noreferrer"
            >
              0xA55Dbd05D330018E2B600236031Fb5b46758c27c →
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
