import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../lib/useWallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../lib/contracts";
import styles from "../styles/Admin.module.css";


export default function Admin() {
  const { address, signer, error: walletError, loading: walletLoading, connect } = useWallet();

  const [isOwner, setIsOwner] = useState(null);
  const [checkingOwner, setCheckingOwner] = useState(false);

  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const [newOperator, setNewOperator] = useState("");
  const [actionStatus, setActionStatus] = useState(null); // null | "pending" | "done" | "error"
  const [actionMsg, setActionMsg] = useState(null);
  const [checkAddress, setCheckAddress] = useState("");
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    if (!address || !signer) return;
    checkOwner();
  }, [address, signer]);

  async function checkOwner() {
    setCheckingOwner(true);
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const owner = await registry.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingOwner(false);
    }
  }

  async function loadOperatorHistory() {
    setLoadingOperators(true);
    try {
      const provider = signer.provider;
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

      const addedFilter = registry.filters.OperatorAdded();
      const removedFilter = registry.filters.OperatorRemoved();

      const addedEvents = await registry.queryFilter(addedFilter, 0, "latest");
      const removedEvents = await registry.queryFilter(removedFilter, 0, "latest");

      const removedAddresses = new Set(
        removedEvents.map((e) => e.args.operator.toLowerCase())
      );

      const active = addedEvents
        .map((e) => e.args.operator)
        .filter((op) => !removedAddresses.has(op.toLowerCase()));

      setOperators([...new Set(active)]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOperators(false);
    }
  }

  useEffect(() => {
    if (isOwner) loadOperatorHistory();
  }, [isOwner]);

  async function handleAdd() {
    if (!ethers.isAddress(newOperator)) {
      setActionMsg("Invalid address.");
      setActionStatus("error");
      return;
    }
    setActionStatus("pending");
    setActionMsg(null);
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registry.addOperator(newOperator);
      await tx.wait();
      setActionMsg(`Operator ${newOperator} added successfully.`);
      setActionStatus("done");
      setNewOperator("");
      loadOperatorHistory();
    } catch (err) {
      setActionMsg(err.message);
      setActionStatus("error");
    }
  }

  async function handleRemove(operatorAddress) {
    setActionStatus("pending");
    setActionMsg(null);
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registry.removeOperator(operatorAddress);
      await tx.wait();
      setActionMsg(`Operator ${operatorAddress} removed successfully.`);
      setActionStatus("done");
      loadOperatorHistory();
    } catch (err) {
      setActionMsg(err.message);
      setActionStatus("error");
    }
  }

  async function handleCheck() {
    if (!ethers.isAddress(checkAddress)) {
      setCheckResult({ error: "Invalid address." });
      return;
    }
    try {
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const result = await registry.operators(checkAddress);
      setCheckResult({ address: checkAddress, isOperator: result });
    } catch (err) {
      setCheckResult({ error: err.message });
    }
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="page-container page-container--admin">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Connect your wallet to access the admin panel.</p>
        <button className={`btn btn-primary ${styles.btn}`} onClick={connect} disabled={walletLoading}>
          {walletLoading ? "Connecting..." : "Connect MetaMask"}
        </button>
        {walletError && <p className="alert-error">{walletError}</p>}
      </div>
    );
  }

  if (checkingOwner) {
    return (
      <div className="page-container page-container--admin">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Checking ownership...</p>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="page-container page-container--admin">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">
          Address <code className="code">{address}</code> is not the contract owner.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container page-container--admin">
      <h1 className="page-title">Admin Panel</h1>
      <p className="page-subtitle">
        Owner: <code className="code">{address}</code>
      </p>

      {/* ── Add operator ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Add operator</h2>
        <div className={styles.row}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            type="text"
            placeholder="0x..."
            value={newOperator}
            onChange={(e) => setNewOperator(e.target.value)}
          />
          <button
            className={`btn btn-primary ${actionStatus === "pending" ? styles.btnDisabled : styles.btn}`}
            onClick={handleAdd}
            disabled={actionStatus === "pending"}
          >
            {actionStatus === "pending" ? "Waiting..." : "Add"}
          </button>
        </div>
      </div>

      {/* ── Action feedback ── */}
      {actionMsg && (
        <p className={actionStatus === "done" ? "alert-success" : "alert-error"}>
          {actionMsg}
        </p>
      )}

      {/* ── Check address ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Check address</h2>
        <div className={styles.row}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            type="text"
            placeholder="0x..."
            value={checkAddress}
            onChange={(e) => setCheckAddress(e.target.value)}
          />
          <button className={`btn btn-primary ${styles.btn}`} onClick={handleCheck}>
            Check
          </button>
        </div>
        {checkResult && !checkResult.error && (
          <p className={checkResult.isOperator ? "alert-success" : "alert-error"}>
            {checkResult.address} is {checkResult.isOperator ? "" : "not "}an authorized operator.
          </p>
        )}
        {checkResult?.error && <p className="alert-error">{checkResult.error}</p>}
      </div>

      {/* ── Active operators ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Active operators</h2>
        {loadingOperators && <p className="page-subtitle">Loading...</p>}
        {!loadingOperators && operators.length === 0 && (
          <p className="page-subtitle">No active operators found.</p>
        )}
        {!loadingOperators && operators.length > 0 && (
          <div className={styles.operatorList}>
            {operators.map((op) => (
              <div key={op} className={styles.operatorRow}>
                <code className="code">{op}</code>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(op)}
                  disabled={actionStatus === "pending"}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

