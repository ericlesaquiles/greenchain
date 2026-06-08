import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI, WASTE_CATEGORIES, DEPLOY_BLOCK } from "../lib/contracts";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

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

  // ── Category colors ────────────────────────────────────────────────────────
  const categoryColor = {
    Plastic: "#3b82f6",
    Paper:   "#f59e0b",
    Metal:   "#6b7280",
    Glass:   "#06b6d4",
    Organic: "#22c55e",
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>Impact Dashboard</h1>
      <p style={s.subtitle}>
        Public record of all verified recycling actions on the GreenChain network.
      </p>

      {errorMsg && <p style={s.error}>{errorMsg}</p>}

      {loading ? (
        <p style={s.subtitle}>Loading on-chain data...</p>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div style={s.summaryRow}>
            <div style={s.summaryCard}>
              <span style={s.summaryValue}>{actions.length}</span>
              <span style={s.summaryLabel}>total actions</span>
            </div>
            <div style={s.summaryCard}>
              <span style={s.summaryValue}>{totalKg} kg</span>
              <span style={s.summaryLabel}>total recycled</span>
            </div>
            <div style={s.summaryCard}>
              <span style={s.summaryValue}>{uniqueCitizens}</span>
              <span style={s.summaryLabel}>citizens</span>
            </div>
            <div style={s.summaryCard}>
              <span style={s.summaryValue}>{uniqueOperators}</span>
              <span style={s.summaryLabel}>operators</span>
            </div>
          </div>

          {/* ── kg by category chart ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Recycled by category</h2>
            <div style={s.chartBox}>
              {kgByCategory.map((cat) => (
                <div key={cat.label} style={s.chartRow}>
                  <span style={s.chartLabel}>{cat.label}</span>
                  <div style={s.barTrack}>
                    <div style={{
                      ...s.bar,
                      width: `${(cat.kg / maxKg) * 100}%`,
                      background: categoryColor[cat.label],
                    }} />
                  </div>
                  <span style={s.chartKg}>{cat.kg} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Action log ── */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Action log</h2>

            <input
              style={s.search}
              type="text"
              placeholder="Search by address, category, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {filtered.length === 0 && (
              <p style={s.subtitle}>No actions match your search.</p>
            )}

            <div style={s.tableWrapper}>
              {filtered.length > 0 && (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>ID</th>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Category</th>
                      <th style={s.th}>Weight</th>
                      <th style={s.th}>Citizen</th>
                      <th style={s.th}>Evidence</th>
                      <th style={s.th}>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <tr key={a.id} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                        <td style={s.td}>#{a.id}</td>
                        <td style={s.td}>
                          {new Date(a.timestamp * 1000).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            ...s.badge,
                            background: categoryColor[a.category] + "22",
                            color: categoryColor[a.category],
                            border: `1px solid ${categoryColor[a.category]}55`,
                          }}>
                            {a.category}
                          </span>
                        </td>
                        <td style={s.td}>{a.weightKg} kg</td>
                        <td style={{...s.td, ...s.mono}}>
                          {a.citizen.slice(0, 6)}...{a.citizen.slice(-4)}
                        </td>
                        <td style={s.td}>
			  <a
                            style={s.link}
                            href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${a.ipfsCid}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            IPFS →
                          </a>
                        </td>
                        <td style={s.td}>
			  <a
                            style={s.link}
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

          <button style={s.refreshBtn} onClick={loadActions}>
            Refresh
          </button>
        </>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: "900px",
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
  error: {
    color: "#f87171",
    fontSize: "14px",
    background: "#450a0a",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #991b1b",
    marginBottom: "16px",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "40px",
  },
  summaryCard: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#86efac",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#888",
  },
  section: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#e0e0e0",
  },
  chartBox: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  chartRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  chartLabel: {
    width: "70px",
    fontSize: "13px",
    color: "#ccc",
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    background: "#2a2a2a",
    borderRadius: "4px",
    height: "12px",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.4s ease",
    minWidth: "4px",
  },
  chartKg: {
    width: "60px",
    fontSize: "13px",
    color: "#aaa",
    textAlign: "right",
    flexShrink: 0,
  },
  search: {
    width: "100%",
    padding: "10px 14px",
    background: "#1a1a1a",
    border: "1px solid #444",
    borderRadius: "8px",
    color: "#f0f0f0",
    fontSize: "14px",
    marginBottom: "16px",
    boxSizing: "border-box",
    outline: "none",
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "12px",
    border: "1px solid #333",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    color: "#888",
    fontWeight: "500",
    fontSize: "12px",
    background: "#111",
    borderBottom: "1px solid #333",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    color: "#e0e0e0",
    whiteSpace: "nowrap",
  },
  rowEven: {
    background: "#1a1a1a",
  },
  rowOdd: {
    background: "#141414",
  },
  badge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: "13px",
  },
  link: {
    color: "#4ade80",
    textDecoration: "none",
    fontSize: "13px",
  },
  refreshBtn: {
    padding: "10px 20px",
    background: "#1a1a1a",
    color: "#aaa",
    border: "1px solid #444",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "60px",
  },
};
