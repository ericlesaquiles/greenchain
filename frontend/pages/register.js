import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../lib/useWallet";
import { uploadEvidenceClient } from "../lib/uploadClient";
import { validateImage } from "../lib/validateImage";
import { REGISTRY_ADDRESS, REGISTRY_ABI, WASTE_CATEGORIES } from "../lib/contracts";

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
    <div style={s.container}>
      <h1 style={s.title}>Register Discard</h1>

      {/* ── Not connected ── */}
      {!address && (
        <div>
          <p style={s.subtitle}>Connect your wallet to register a discard action.</p>
          <button style={s.btn} onClick={connect} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : "Connect MetaMask"}
          </button>
          {walletError && <p style={s.error}>{walletError}</p>}
        </div>
      )}

      {/* ── Checking operator ── */}
      {address && checkingOperator && (
        <p style={s.subtitle}>Checking operator status...</p>
      )}

      {/* ── Not an operator ── */}
      {address && !checkingOperator && isOperator === false && (
        <div>
          <p style={s.subtitle}>
            The address <code style={s.code}>{address}</code> is not an authorized operator.
          </p>
        </div>
      )}

      {/* ── Success ── */}
      {address && isOperator && status === "done" && (
        <div style={s.successBox}>
          <h2 style={s.successTitle}>Discard registered successfully</h2>
          <p style={s.subtitle}>The citizen has received their certificate.</p>
          <a style={s.link} href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            View transaction on Etherscan →
          </a>
          <br />
          <a style={s.link} href={photoUrl} target="_blank" rel="noreferrer">
            View evidence on IPFS →
          </a>
          <br />
          <button style={{...s.btn, marginTop: "24px"}} onClick={() => {
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
          <p style={s.subtitle}>
            Connected as: <code style={s.code}>{address}</code>
          </p>
          <form onSubmit={handleSubmit} style={s.form}>

            <div style={s.field}>
              <label style={s.label}>Citizen wallet address</label>
              <input style={s.input} type="text" placeholder="0x..." value={citizen}
                onChange={(e) => setCitizen(e.target.value)} required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Waste category</label>
              <select style={s.input} value={category}
                onChange={(e) => setCategory(Number(e.target.value))}>
                {WASTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Estimated weight (kg)</label>
              <input style={s.input} type="number" min="1" max="65535"
                placeholder="e.g. 5" value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)} required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Location</label>
              <input style={s.input} type="text"
                placeholder="e.g. Campinas, SP — Ponto de coleta Barão Geraldo"
                value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Evidence photo</label>
              <input style={s.input} type="file" accept="image/*"
                onChange={handlePhotoChange} required />
            </div>

            {photoPreview && (
              <img src={photoPreview} alt="Preview" style={s.preview} />
            )}

            {validation === "validating" && (
              <div style={s.validating}>
                Analyzing photo with AI...
              </div>
            )}

            {validation && validation !== "validating" && (
             <div style={validation.valid ? s.validPass : s.validFail}>
               <div style={s.validHeader}>
                 <span style={s.validIcon}>
                   {validation.valid ? "✓" : "⚠"}
                 </span>
                 <span style={s.validTitle}>
                   {validation.valid
                     ? `Valid ${WASTE_CATEGORIES[category].label} evidence`
                     : `Photo may not match ${WASTE_CATEGORIES[category].label}`}
                 </span>
                 <span style={s.validConfidence}>
                   {validation.confidence} confidence
                 </span>
               </div>
               <p style={s.validReason}>{validation.reason}</p>
               <p style={s.validDetected}>Detected: {validation.detected}</p>
               {!validation.valid && (
                  <p style={s.validOverride}>
                    You can still submit — the operator is responsible for accuracy.
                  </p>
                )}
              </div>
            )}

            {errorMsg && <p style={s.error}>{errorMsg}</p>}

            <button style={isSubmitting ? s.btnDisabled : s.btn}
              type="submit" disabled={isSubmitting}>
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

// ── Inline styles ────────────────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: "560px",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#ccc",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #444",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
    background: "#1a1a1a",
    color: "#f0f0f0",
  },
  preview: {
    width: "100%",
    maxHeight: "220px",
    objectFit: "cover",
    borderRadius: "8px",
    border: "1px solid #444",
  },
  btn: {
    padding: "12px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  btnDisabled: {
    padding: "12px",
    background: "#166534",
    color: "#86efac",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "not-allowed",
    width: "100%",
  },
  error: {
    color: "#f87171",
    fontSize: "14px",
    background: "#450a0a",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #991b1b",
  },
  successBox: {
    background: "#052e16",
    border: "1px solid #166534",
    borderRadius: "12px",
    padding: "24px",
  },
  successTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#86efac",
    marginBottom: "8px",
  },
  link: {
    color: "#4ade80",
    fontSize: "14px",
    textDecoration: "none",
  },
validating: {
  padding: "12px 16px",
  background: "#1a1a1a",
  border: "1px solid #444",
  borderRadius: "8px",
  color: "#aaa",
  fontSize: "14px",
},
validPass: {
  padding: "14px 16px",
  background: "#052e16",
  border: "1px solid #166534",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
},
validFail: {
  padding: "14px 16px",
  background: "#431407",
  border: "1px solid #9a3412",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
},
validHeader: {
  display: "flex",
  alignItems: "center",
  gap: "8px",
},
validIcon: {
  fontSize: "16px",
  fontWeight: "700",
},
validTitle: {
  fontSize: "14px",
  fontWeight: "600",
  color: "#f0f0f0",
  flex: 1,
},
validConfidence: {
  fontSize: "12px",
  color: "#888",
  textTransform: "capitalize",
},
validReason: {
  fontSize: "13px",
  color: "#ccc",
  margin: 0,
},
validDetected: {
  fontSize: "13px",
  color: "#888",
  margin: 0,
},
validOverride: {
  fontSize: "12px",
  color: "#f97316",
  margin: 0,
  borderTop: "1px solid #7c2d12",
  paddingTop: "8px",
  marginTop: "4px",
},
};
