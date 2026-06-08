import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../lib/useWallet";
import { uploadEvidenceClient } from "../lib/uploadClient";
import { validateImage } from "../lib/validateImage";
import { REGISTRY_ADDRESS, REGISTRY_ABI, WASTE_CATEGORIES } from "../lib/contracts";
import styles from "../styles/Register.module.css";
import WalletConnect from "../components/WalletConnect";

export default function Register() {
  const { address, signer, error: walletError, loading: walletLoading, connect } = useWallet();

  const [isOperator, setIsOperator] = useState(null);
  const [checkingOperator, setCheckingOperator] = useState(false);

  const [citizen, setCitizen] = useState("");
  const [category, setCategory] = useState(0);
  const [weightKg, setWeightKg] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [validation, setValidation] = useState(null); // null | validating | result object

  const [status, setStatus] = useState("idle");
  const [txHash, setTxHash] = useState(null);
  const [metadataCid, setMetadataCid] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!photo) { setValidation(null); return; }
    setValidation("validating");
    validateImage(photo, WASTE_CATEGORIES[category].label)
      .then((result) => setValidation(result))
      .catch((err) => {
        console.error(err);
        setValidation(null);
      });
  }, [photo, category]);

  useEffect(() => {
    if (!address || !signer) return;
    setCheckingOperator(true);
    const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
    registry.operators(address)
      .then((result) => setIsOperator(result))
      .catch(console.error)
      .finally(() => setCheckingOperator(false));
  }, [address, signer]);

  useEffect(() => {
    if (address) setCitizen(address);
  }, [address]);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    if (!photo) { setErrorMsg("Please attach a photo as evidence."); return; }
    try {
      setStatus("uploading");
      const result = await uploadEvidenceClient(photo, {
        citizenAddress: citizen,
        operatorAddress: address,
        category: WASTE_CATEGORIES[category].label,
        weightKg: Number(weightKg),
        location,
      });
      const { metadataCid: cid, photoUrl: pUrl } = result;
      setMetadataCid(cid);
      setPhotoUrl(pUrl);
      setStatus("confirming");
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const tx = await registry.registerDiscard(citizen, category, Number(weightKg), cid);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  const isSubmitting = status === "uploading" || status === "confirming";

  return (
    <div className="page-container page-container--narrow">
      <h1 className="page-title">Register Discard</h1>

      {/* ── Not connected ── */}
      {!address && (
        <WalletConnect
          subtitle="Connect your wallet to register a discard action."
          buttonSize="full"
        />
      )}

      {/* ── Checking operator ── */}
      {address && checkingOperator && (
        <p className="page-subtitle">Checking operator status...</p>
      )}

      {/* ── Not an operator ── */}
      {address && !checkingOperator && isOperator === false && (
        <div>
          <p className="page-subtitle">
            The address <code className="code">{address}</code> is not an authorized operator.
          </p>
        </div>
      )}

      {/* ── Success ── */}
      {address && isOperator && status === "done" && (
        <div className={`panel panel--green ${styles.successBox}`}>
          <h2 className="success-title">Discard registered successfully</h2>
          <p className="page-subtitle">The citizen has received their certificate.</p>
          <a className="link link--md" href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            View transaction on Etherscan →
          </a>
          <br />
          <a className="link link--md" href={photoUrl} target="_blank" rel="noreferrer">
            View evidence on IPFS →
          </a>
          <br />
          <button className={`btn btn-primary btn-primary--full ${styles.btnAnother}`} onClick={() => {
            setStatus("idle"); setCitizen(""); setWeightKg("");
            setLocation(""); setPhoto(null); setPhotoPreview(null);
            setTxHash(null); setMetadataCid(null); setPhotoUrl(null);
          }}>
            Register another discard
          </button>
        </div>
      )}

      {/* ── Form ── */}
      {address && !checkingOperator && isOperator && status !== "done" && (
        <div>
          <p className="page-subtitle">
            Connected as: <code className="code">{address}</code>
          </p>
          <form onSubmit={handleSubmit} className={styles.form}>

            <div className={styles.field}>
              <label className={styles.label}>Citizen wallet address</label>
              <input className="input-field" type="text" placeholder="0x..." value={citizen}
                onChange={(e) => setCitizen(e.target.value)} required />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Waste category</label>
              <select className="input-field" value={category}
                onChange={(e) => setCategory(Number(e.target.value))}>
                {WASTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Estimated weight (kg)</label>
              <input className="input-field" type="number" min="1" max="65535"
                placeholder="e.g. 5" value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)} required />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input className="input-field" type="text"
                placeholder="e.g. Campinas, SP — Ponto de coleta Barão Geraldo"
                value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Evidence photo</label>
              <input className="input-field" type="file" accept="image/*"
                onChange={handlePhotoChange} required />
            </div>

            {photoPreview && (
              <img src={photoPreview} alt="Preview" className={styles.preview} />
            )}

            {validation === "validating" && (
              <div className={styles.validating}>
                Analyzing photo with AI...
              </div>
            )}

            {validation && validation !== "validating" && (
              <div className={validation.valid ? styles.validPass : styles.validFail}>
                <div className={styles.validHeader}>
                  <span className={styles.validIcon}>
                    {validation.valid ? "✓" : "⚠"}
                  </span>
                  <span className={styles.validTitle}>
                    {validation.valid
                      ? `Valid ${WASTE_CATEGORIES[category].label} evidence`
                      : `Photo may not match ${WASTE_CATEGORIES[category].label}`}
                  </span>
                  <span className={styles.validConfidence}>
                    {validation.confidence} confidence
                  </span>
                </div>
                <p className={styles.validReason}>{validation.reason}</p>
                <p className={styles.validDetected}>Detected: {validation.detected}</p>
                {!validation.valid && (
                  <p className={styles.validOverride}>
                    You can still submit — the operator is responsible for accuracy.
                  </p>
                )}
              </div>
            )}

            {errorMsg && <p className="alert-error">{errorMsg}</p>}

            <button
              className={isSubmitting ? "btn btn-primary--disabled" : "btn btn-primary btn-primary--full"}
              type="submit"
              disabled={isSubmitting}
            >
              {status === "uploading" && "Uploading evidence to IPFS..."}
              {status === "confirming" && "Waiting for blockchain confirmation..."}
              {(status === "idle" || status === "error") && "Register discard"}
            </button>

          </form>
        </div>
      )}
    </div>
  );
}
