import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { useWallet } from "../../lib/useWallet";
import {
  REGISTRY_ADDRESS, REGISTRY_ABI,
  GOVERNANCE_ADDRESS, GOVERNANCE_ABI,
  PROPOSAL_STATES, PROPOSAL_TYPES,
} from "../../lib/contracts";
import s from "../../styles/Governance.module.css";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const STATE_COLORS = {
  Active:       { bg: "#052e16", border: "#166534", text: "#86efac" },
  Passed:       { bg: "#1e3a5f", border: "#1d4ed8", text: "#93c5fd" },
  Rejected:     { bg: "#450a0a", border: "#991b1b", text: "#fca5a5" },
  Executed:     { bg: "#2e1065", border: "#7c3aed", text: "#c4b5fd" },
  Acknowledged: { bg: "#1c1917", border: "#78716c", text: "#d6d3d1" },
};

export default function Governance() {
  const { address, signer, connect, loading: walletLoading, error: walletError } = useWallet();

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [tab, setTab] = useState("Membership");
  const [isOperator, setIsOperator] = useState(false);
  const [isVoter, setIsVoter] = useState(false);
  const [voterCount, setVoterCount] = useState(0);
  const [actionStatus, setActionStatus] = useState({});
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    loadProposals();
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!address || !signer) return;
    loadUserStatus();
  }, [address, signer]);

  async function loadProposals() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, provider);

      const count = Number(await governance.proposalCount());
      const loaded = [];
      for (let i = 0; i < count; i++) {
        const p = await governance.getProposal(i);
        let ipfsData = null;
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${p.ipfsCid}`
          );
          ipfsData = await res.json();
        } catch {}
        loaded.push({
          id: Number(p.id),
          proposalType: PROPOSAL_TYPES[Number(p.proposalType)],
          proposer: p.proposer,
          target: p.target,
          isAddition: p.isAddition,
          ipfsCid: p.ipfsCid,
          yesVotes: Number(p.yesVotes),
          noVotes: Number(p.noVotes),
          deadline: Number(p.deadline),
          executionTime: Number(p.executionTime),
          state: PROPOSAL_STATES[Number(p.state)],
          executed: p.executed,
          title: ipfsData?.title ?? "Untitled proposal",
          description: ipfsData?.description ?? "",
          organization: ipfsData?.organization ?? "",
        });
      }
      loaded.sort((a, b) => b.id - a.id);
      setProposals(loaded);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserStatus() {
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const [op, voter, count] = await Promise.all([
        registry.operators(address),
        governance.isVoter(address),
        governance.activeVoterCount(),
      ]);
      setIsOperator(op);
      setIsVoter(voter);
      setVoterCount(Number(count));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleOptIn() {
    setActionStatus({ type: "optin", status: "pending" });
    try {
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const tx = await governance.optInToGovernance();
      await tx.wait();
      setIsVoter(true);
      setVoterCount((v) => v + 1);
      setActionStatus({ type: "optin", status: "done" });
    } catch (err) {
      setActionStatus({ type: "optin", status: "error", msg: err.message });
    }
  }

  async function handleOptOut() {
    setActionStatus({ type: "optout", status: "pending" });
    try {
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const tx = await governance.optOutOfGovernance();
      await tx.wait();
      setIsVoter(false);
      setVoterCount((v) => Math.max(0, v - 1));
      setActionStatus({ type: "optout", status: "done" });
    } catch (err) {
      setActionStatus({ type: "optout", status: "error", msg: err.message });
    }
  }

  async function handleVote(proposalId, support) {
    setActionStatus({ type: "vote", id: proposalId, status: "pending" });
    try {
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const tx = await governance.castVote(proposalId, support);
      await tx.wait();
      setActionStatus({ type: "vote", id: proposalId, status: "done" });
      loadProposals();
    } catch (err) {
      setActionStatus({ type: "vote", id: proposalId, status: "error", msg: err.message });
    }
  }

  async function handleExecute(proposalId) {
    setActionStatus({ type: "execute", id: proposalId, status: "pending" });
    try {
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const tx = await governance.executeProposal(proposalId);
      await tx.wait();
      setActionStatus({ type: "execute", id: proposalId, status: "done" });
      loadProposals();
    } catch (err) {
      setActionStatus({ type: "execute", id: proposalId, status: "error", msg: err.message });
    }
  }

  async function handleAcknowledge(proposalId) {
    setActionStatus({ type: "acknowledge", id: proposalId, status: "pending" });
    try {
      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);
      const tx = await governance.acknowledgeManagementProposal(proposalId);
      await tx.wait();
      setActionStatus({ type: "acknowledge", id: proposalId, status: "done" });
      loadProposals();
    } catch (err) {
      setActionStatus({ type: "acknowledge", id: proposalId, status: "error", msg: err.message });
    }
  }

  function formatTimeLeft(deadline) {
    const diff = deadline - now;
    if (diff <= 0) return "Voting ended";
    const m = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${m}m ${sec}s remaining`;
  }

  const filtered = proposals.filter((p) => p.proposalType === tab);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Governance</h1>
          <p className={s.subtitle}>
            Operators vote to add or remove members and propose rule changes.
          </p>
        </div>
        {address && (
          <Link href="/governance/propose" className={s.proposeBtn}>
            + New proposal
          </Link>
        )}
      </div>

      {/* ── Voter status bar ── */}
      {address && (
        <div className={s.statusBar}>
          <div className={s.statusItem}>
            <span className={s.statusLabel}>Status</span>
            <span className={`${s.statusValue} ${isOperator ? s.statusValueGreen : s.statusValueRed}`}>
              {isOperator ? "Operator" : "Not an operator"}
            </span>
          </div>
          <div className={s.statusDivider} />
          <div className={s.statusItem}>
            <span className={s.statusLabel}>Governance</span>
            <span className={`${s.statusValue} ${isVoter ? s.statusValueGreen : ""}`}>
              {isVoter ? "Active voter" : "Not a voter"}
            </span>
          </div>
          <div className={s.statusDivider} />
          <div className={s.statusItem}>
            <span className={s.statusLabel}>Active voters</span>
            <span className={s.statusValue}>{voterCount}</span>
          </div>
          <div className={s.statusDivider} />
          <div className={s.statusItem}>
            {isOperator && !isVoter && (
              <button
                className={s.optBtn}
                onClick={handleOptIn}
                disabled={actionStatus.type === "optin" && actionStatus.status === "pending"}
              >
                {actionStatus.type === "optin" && actionStatus.status === "pending"
                  ? "Joining..." : "Join governance"}
              </button>
            )}
            {isVoter && (
              <button
                className={s.optOutBtn}
                onClick={handleOptOut}
                disabled={actionStatus.type === "optout" && actionStatus.status === "pending"}
              >
                {actionStatus.type === "optout" && actionStatus.status === "pending"
                  ? "Leaving..." : "Leave governance"}
              </button>
            )}
          </div>
        </div>
      )}

      {!address && (
        <div className={s.connectBox}>
          <p className={s.subtitle}>Connect your wallet to vote or submit proposals.</p>
          <button className={s.btn} onClick={connect} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : "Connect MetaMask"}
          </button>
          {walletError && <p className="alert-error">{walletError}</p>}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className={s.tabs}>
        {["Membership", "Management"].map((t) => (
          <button
            key={t}
            className={tab === t ? s.tabActive : s.tab}
            onClick={() => setTab(t)}
          >
            {t}
            <span className={s.tabCount}>
              {proposals.filter((p) => p.proposalType === t).length}
            </span>
          </button>
        ))}
      </div>

      {errorMsg && <p className="alert-error">{errorMsg}</p>}

      {loading && <p className={s.subtitle}>Loading proposals...</p>}

      {!loading && filtered.length === 0 && (
        <div className={s.emptyBox}>
          <p className={s.emptyText}>No {tab.toLowerCase()} proposals yet.</p>
          {address && isOperator && (
            <Link href="/governance/propose" className={s.btn}>
              Submit the first one →
            </Link>
          )}
        </div>
      )}

      {/* ── Proposal cards ── */}
      <div className={s.cardList}>
        {filtered.map((p) => {
          const stateColor = STATE_COLORS[p.state] ?? STATE_COLORS.Active;
          const isVoting = actionStatus.type === "vote" &&
            actionStatus.id === p.id &&
            actionStatus.status === "pending";
          const isExecuting = actionStatus.type === "execute" &&
            actionStatus.id === p.id &&
            actionStatus.status === "pending";
          const isAcknowledging = actionStatus.type === "acknowledge" &&
            actionStatus.id === p.id &&
            actionStatus.status === "pending";
          const totalVotes = p.yesVotes + p.noVotes;
          const yesPercent = totalVotes > 0
            ? Math.round((p.yesVotes / totalVotes) * 100) : 0;
          const canExecute = p.state === "Passed" &&
            now >= p.executionTime &&
            p.proposalType === "Membership";
          const canAcknowledge = p.state === "Passed" &&
            now >= p.deadline &&
            p.proposalType === "Management";

          return (
            <div key={p.id} className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  {/* State badge — colours are runtime-dynamic */}
                  <span
                    className={s.stateBadge}
                    style={{
                      background: stateColor.bg,
                      border: `1px solid ${stateColor.border}`,
                      color: stateColor.text,
                    }}
                  >
                    {p.state}
                  </span>
                  {p.proposalType === "Membership" && (
                    <span
                      className={s.typeBadge}
                      style={{
                        color: p.isAddition ? "#86efac" : "#f87171",
                        background: p.isAddition ? "#052e16" : "#450a0a",
                        border: `1px solid ${p.isAddition ? "#166534" : "#991b1b"}`,
                      }}
                    >
                      {p.isAddition ? "Add member" : "Remove member"}
                    </span>
                  )}
                </div>
                <span className={s.proposalId}>#{p.id}</span>
              </div>

              <div className={s.cardBody}>
                <h3 className={s.cardTitle}>{p.title}</h3>
                {p.description && (
                  <p className={s.cardDescription}>{p.description}</p>
                )}

                {p.proposalType === "Membership" && p.target !== ethers.ZeroAddress && (
                  <div className={s.targetBox}>
                    <span className={s.targetLabel}>
                      {p.isAddition ? "Proposed operator" : "Operator to remove"}
                    </span>
                    <code className={s.targetAddress}>{p.target}</code>
                    {p.organization && (
                      <span className={s.targetOrg}>{p.organization}</span>
                    )}
                  </div>
                )}

                <div className={s.cardMeta}>
                  <span className={s.metaItem}>
                    Proposed by {p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}
                  </span>
                  {p.state === "Active" && (
                    <span className={s.metaItem}>{formatTimeLeft(p.deadline)}</span>
                  )}
                </div>
              </div>

              {/* ── Vote bar ── */}
              <div className={s.voteSection}>
                <div className={s.voteBar}>
                  {/* Width is runtime-dynamic */}
                  <div className={s.voteBarYes} style={{ width: `${yesPercent}%` }} />
                </div>
                <div className={s.voteNumbers}>
                  <span className={s.voteYes}>{p.yesVotes} Yes</span>
                  <span className={s.voteNo}>{p.noVotes} No</span>
                </div>
              </div>

              {/* ── Actions ── */}
              {address && isVoter && p.state === "Active" && now < p.deadline && (
                <div className={s.voteActions}>
                  <button
                    className={isVoting ? s.voteBtnDisabled : s.voteBtnYes}
                    onClick={() => handleVote(p.id, true)}
                    disabled={isVoting}
                  >
                    {isVoting ? "Voting..." : "Vote Yes"}
                  </button>
                  <button
                    className={isVoting ? s.voteBtnDisabled : s.voteBtnNo}
                    onClick={() => handleVote(p.id, false)}
                    disabled={isVoting}
                  >
                    {isVoting ? "Voting..." : "Vote No"}
                  </button>
                </div>
              )}

              {address && canExecute && (
                <div className={s.voteActions}>
                  <button
                    className={isExecuting ? s.voteBtnDisabled : s.executeBtn}
                    onClick={() => handleExecute(p.id)}
                    disabled={isExecuting}
                  >
                    {isExecuting ? "Executing..." : "Execute proposal"}
                  </button>
                </div>
              )}

              {address && canAcknowledge && (
                <div className={s.voteActions}>
                  <button
                    className={isAcknowledging ? s.voteBtnDisabled : s.executeBtn}
                    onClick={() => handleAcknowledge(p.id)}
                    disabled={isAcknowledging}
                  >
                    {isAcknowledging ? "Acknowledging..." : "Acknowledge proposal"}
                  </button>
                </div>
              )}

              {/* ── Action error ── */}
              {actionStatus.id === p.id && actionStatus.status === "error" && (
                <p className="alert-error" style={{ margin: "0 16px 16px" }}>
                  {actionStatus.msg}
                </p>
              )}

              <div className={s.cardFooter}>
                <a
                  className="link link--sm"
                  href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${p.ipfsCid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View full proposal on IPFS →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <button className={s.refreshBtn} onClick={loadProposals}>
        Refresh
      </button>
    </div>
  );
}
