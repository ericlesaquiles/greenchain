import { useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import { useWallet } from "../../lib/useWallet";
import {
  GOVERNANCE_ADDRESS, GOVERNANCE_ABI,
  REGISTRY_ADDRESS, REGISTRY_ABI,
} from "../../lib/contracts";
import { uploadEvidenceClient } from "../../lib/uploadClient";
import s from "../../styles/Governance.module.css";

export default function Propose() {
  const router = useRouter();
  const { address, signer, connect, loading: walletLoading, error: walletError } = useWallet();

  const [proposalType, setProposalType] = useState("Membership");
  const [isAddition, setIsAddition] = useState(true);
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organization, setOrganization] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const [txHash, setTxHash] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);

    if (proposalType === "Membership" && !ethers.isAddress(target)) {
      setErrorMsg("Please enter a valid wallet address for the target operator.");
      return;
    }

    try {
      setStatus("uploading");

      // Build proposal metadata JSON and upload to IPFS
      const metadata = {
        title,
        description,
        proposalType,
        ...(proposalType === "Membership" && {
          target,
          isAddition,
          organization,
          contactInfo,
        }),
        proposer: address,
        submittedAt: new Date().toISOString(),
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        JSON.stringify({ ...metadata, citizenAddress: address, operatorAddress: address })
      );
      // Dummy photo blob since uploadEvidenceClient expects a file
      const dummyBlob = new Blob(
        [JSON.stringify(metadata)],
        { type: "application/json" }
      );
      const dummyFile = new File([dummyBlob], "proposal.json", {
        type: "application/json",
      });
      formData.append("photo", dummyFile);

      const uploadRes = await fetch("/api/upload-proposal", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload proposal to IPFS");
      const { cid } = await uploadRes.json();

      setStatus("confirming");

      const governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);

      let tx;
      if (proposalType === "Membership") {
        tx = await governance.submitMembershipProposal(target, isAddition, cid);
      } else {
        tx = await governance.submitManagementProposal(cid);
      }

      setTxHash(tx.hash);
      await tx.wait();
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  if (!address) {
    return (
      <div className={s.containerNarrow}>
        <h1 className={s.title}>Submit Proposal</h1>
        <p className={s.subtitle}>Connect your wallet to submit a governance proposal.</p>
        <button className={s.btnFull} onClick={connect} disabled={walletLoading}>
          {walletLoading ? "Connecting..." : "Connect MetaMask"}
        </button>
        {walletError && <p className="alert-error">{walletError}</p>}
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className={s.containerNarrow}>
        <h1 className={s.title}>Proposal Submitted</h1>
        <div className={s.successBox}>
          <p className={s.successText}>
            Your proposal has been recorded on-chain and is now open for voting.
          </p>
          <a
            className="link link--md"
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction on Etherscan →
          </a>
          <div className={s.successButtons}>
            <button className={s.btn} onClick={() => router.push("/governance")}>
              Back to governance →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitting = status === "uploading" || status === "confirming";

  return (
    <div className={s.containerNarrow}>
      <h1 className={s.title}>Submit Proposal</h1>
      <p className={s.subtitle}>
        Proposals are stored on IPFS and recorded on-chain.
        All operators who have opted into governance will be able to vote.
      </p>

      <form onSubmit={handleSubmit} className={s.form}>

        {/* ── Proposal type ── */}
        <div className={s.field}>
          <label className={s.label}>Proposal type</label>
          <div className={s.typeRow}>
            {["Membership", "Management"].map((t) => (
              <button
                key={t}
                type="button"
                className={proposalType === t ? s.typeActive : s.typeBtn}
                onClick={() => setProposalType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p className={s.hint}>
            {proposalType === "Membership"
              ? "Propose adding or removing an operator from the network."
              : "Propose a rule or process change for the network to vote on."}
          </p>
        </div>

        {/* ── Membership specific fields ── */}
        {proposalType === "Membership" && (
          <>
            <div className={s.field}>
              <label className={s.label}>Action</label>
              <div className={s.typeRow}>
                <button
                  type="button"
                  className={isAddition ? s.typeActive : s.typeBtn}
                  onClick={() => setIsAddition(true)}
                >
                  Add operator
                </button>
                <button
                  type="button"
                  className={!isAddition ? s.typeActiveRed : s.typeBtn}
                  onClick={() => setIsAddition(false)}
                >
                  Remove operator
                </button>
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>
                {isAddition ? "Applicant wallet address" : "Operator to remove"}
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="0x..."
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              />
            </div>

            {isAddition && (
              <>
                <div className={s.field}>
                  <label className={s.label}>Organization name</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="e.g. Cooperativa Verde Campinas"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Contact information</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="e.g. email, website, or social media"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Common fields ── */}
        <div className={s.field}>
          <label className={s.label}>Title</label>
          <input
            className="input-field"
            type="text"
            placeholder={
              proposalType === "Membership"
                ? "e.g. Add Cooperativa Verde as operator"
                : "e.g. Require photo validation before registration"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>Description</label>
          <textarea
            className={s.textarea}
            rows={5}
            placeholder={
              proposalType === "Membership"
                ? "Describe the applicant, their recycling operations, and why they should be trusted as an operator..."
                : "Describe the proposed rule or process change and the reasoning behind it..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {errorMsg && <p className="alert-error">{errorMsg}</p>}

        <button
          className={isSubmitting ? s.btnDisabled : s.btnFull}
          type="submit"
          disabled={isSubmitting}
        >
          {status === "uploading" && "Uploading to IPFS..."}
          {status === "confirming" && "Waiting for confirmation..."}
          {(status === "idle" || status === "error") && "Submit proposal"}
        </button>

      </form>
    </div>
  );
}
