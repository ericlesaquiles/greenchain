import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI, WASTE_CATEGORIES, DEPLOY_BLOCK } from "../lib/contracts";
import styles from "../styles/Dashboard.module.css";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const categoryBarClass = {
  Plastic: "bar-plastic",
  Paper: "bar-paper",
  Metal: "bar-metal",
  Glass: "bar-glass",
  Organic: "bar-organic",
};

const categoryBadgeClass = {
  Plastic: "badge-plastic",
  Paper: "badge-paper",
  Metal: "badge-metal",
  Glass: "badge-glass",
  Organic: "badge-organic",
};

export default function Dashboard() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadActions();
  }, []);

  async function loadActions() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

      const latestBlock = await provider.getBlockNumber();
      const CHUNK_SIZE = 9; // stay within Alchemy free tier limit of 10
      const filter = registry.filters.DiscardRegistered();

      let allEvents = [];
      for (let from = DEPLOY_BLOCK; from <= latestBlock; from += CHUNK_SIZE) {
        const to = Math.min(from + CHUNK_SIZE - 1, latestBlock);
        const events = await registry.queryFilter(filter, from, to);
        allEvents = allEvents.concat(events);
      }

      const parsed = allEvents.map((e) => ({
        id: e.args.id.toString(),
        operator: e.args.operator,
        citizen: e.args.citizen,
        category: WASTE_CATEGORIES[Number(e.args.category)]?.label ?? "Unknown",
        weightKg: Number(e.args.weightKg),
        ipfsCid: e.args.ipfsCid,
        timestamp: Number(e.args.timestamp),
        txHash: e.transactionHash,
      }));

      // Sort most recent first
      parsed.sort((a, b) => b.timestamp - a.timestamp);
      setActions(parsed);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived metrics ────────────────────────────────────────────────────────
  const totalKg = actions.reduce((sum, a) => sum + a.weightKg, 0);
  const uniqueCitizens = new Set(actions.map((a) => a.citizen)).size;
  const uniqueOperators = new Set(actions.map((a) => a.operator)).size;

  const kgByCategory = WASTE_CATEGORIES.map((cat) => ({
    label: cat.label,
    kg: actions
      .filter((a) => a.category === cat.label)
      .reduce((sum, a) => sum + a.weightKg, 0),
  }));

  const maxKg = Math.max(...kgByCategory.map((c) => c.kg), 1);

  // ── Search filter ──────────────────────────────────────────────────────────
  const filtered = actions.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.citizen.toLowerCase().includes(q) ||
      a.operator.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.id.includes(q)
    );
  });

  return (
    <div className="page-container page-container--wide">
      <h1 className="page-title">Impact Dashboard</h1>
      <p className="page-subtitle">
        Public record of all verified recycling actions on the GreenChain network.
      </p>

      {errorMsg && <p className="alert-error">{errorMsg}</p>}

      {loading ? (
        <p className="page-subtitle">Loading on-chain data...</p>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className={styles.summaryRow}>
            <div className={`panel ${styles.summaryCard}`}>
              <span className="summary-value">{actions.length}</span>
              <span className="summary-label">total actions</span>
            </div>
            <div className={`panel ${styles.summaryCard}`}>
              <span className="summary-value">{totalKg} kg</span>
              <span className="summary-label">total recycled</span>
            </div>
            <div className={`panel ${styles.summaryCard}`}>
              <span className="summary-value">{uniqueCitizens}</span>
              <span className="summary-label">citizens</span>
            </div>
            <div className={`panel ${styles.summaryCard}`}>
              <span className="summary-value">{uniqueOperators}</span>
              <span className="summary-label">operators</span>
            </div>
          </div>

          {/* ── kg by category chart ── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Recycled by category</h2>
            <div className={`panel ${styles.chartBox}`}>
              {kgByCategory.map((cat) => (
                <div key={cat.label} className={styles.chartRow}>
                  <span className={styles.chartLabel}>{cat.label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.bar} ${categoryBarClass[cat.label] ?? ""}`}
                      style={{ "--bar-width": `${(cat.kg / maxKg) * 100}%` }}
                    />
                  </div>
                  <span className={styles.chartKg}>{cat.kg} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Action log ── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Action log</h2>

            <input
              className="input-field input-field--search"
              type="text"
              placeholder="Search by address, category, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {filtered.length === 0 && (
              <p className="page-subtitle">No actions match your search.</p>
            )}

            <div className={styles.tableWrapper}>
              {filtered.length > 0 && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>ID</th>
                      <th className={styles.th}>Date</th>
                      <th className={styles.th}>Category</th>
                      <th className={styles.th}>Weight</th>
                      <th className={styles.th}>Citizen</th>
                      <th className={styles.th}>Evidence</th>
                      <th className={styles.th}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td className={styles.td}>#{a.id}</td>
                        <td className={styles.td}>
                          {new Date(a.timestamp * 1000).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className={styles.td}>
                          <span className={`badge-pill ${categoryBadgeClass[a.category] ?? ""}`}>
                            {a.category}
                          </span>
                        </td>
                        <td className={styles.td}>{a.weightKg} kg</td>
                        <td className={`${styles.td} mono`}>
                          {a.citizen.slice(0, 6)}...{a.citizen.slice(-4)}
                        </td>
                        <td className={styles.td}>
                          <a
                            className="link link--sm"
                            href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${a.ipfsCid}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            IPFS →
                          </a>
                        </td>
                        <td className={styles.td}>
                          <a
                            className="link link--sm"
                            href={`https://sepolia.etherscan.io/tx/${a.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Etherscan →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <button className={`btn btn-secondary ${styles.refreshSpaced}`} onClick={loadActions}>
            Refresh
          </button>
        </>
      )}
    </div>
  );
}
