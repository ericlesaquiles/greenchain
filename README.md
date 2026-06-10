# GreenChain

> Verified recycling actions, permanently recorded on the blockchain.

GreenChain is a blockchain-based platform that transforms recycling actions into verifiable, auditable, and transparent records. Every discard action is registered on-chain, linked to photographic evidence stored on IPFS, and certified with a Soulbound Token (SBT) — creating a chain of custody that citizens, operators, companies, and the public can trust.

Built for the **ImpactLedger** challenge at **Hackweb 2025**.

---

## The problem

Recycling initiatives in Brazil and worldwide suffer from a fundamental trust gap. Cooperatives, municipalities, and ESG-driven companies have no reliable way to prove that recycling actually happened. Records are kept in spreadsheets, photos are stored locally, and validations are informal.

This means:
- Citizens receive no verifiable proof of their actions
- Companies cannot audit recycling claims for ESG reporting
- Cooperatives cannot prove volume to attract larger contracts
- There is no shared layer of trust between all parties

## The solution

GreenChain introduces a shared, tamper-proof record layer using Ethereum smart contracts and IPFS:

- **Operators** (cooperatives, collection points) register discard actions on-chain with photographic evidence
- **Citizens** automatically receive a Soulbound Token as a non-transferable certificate of participation
- **Anyone** can audit the full history of actions via the public dashboard, with every record linking back to its Etherscan transaction and IPFS evidence
- **Governance** is decentralized — operators vote on-chain to add or remove members and propose rule changes

---

## Architecture

### What goes on-chain
- Operator address
- Citizen address
- Waste category (Plastic, Paper, Metal, Glass, Organic)
- Estimated weight (kg)
- IPFS CID of the evidence metadata
- Timestamp
- Governance proposals and votes

### What goes off-chain (IPFS via Pinata)
- Evidence photo
- Full metadata JSON: citizen, operator, category, weight, location, photo CID, timestamp
- Governance proposal full text: title, description, organization, contact info

### Why this split
Storing large files on-chain is prohibitively expensive. The CID stored on-chain is a cryptographic hash of the off-chain content — if anyone tampers with the IPFS file, the CID no longer matches, making tampering detectable.

### Contracts

| Contract | Address | Etherscan |
|---|---|---|
| GreenRegistry | `0x23ADABf4F0474F81fFfd111A432BEc7244bc11df` | [View](https://sepolia.etherscan.io/address/0x23ADABf4F0474F81fFfd111A432BEc7244bc11df#code) |
| GreenSBT | `0x1c60499FE6531642e4d363423faE51594F447180` | [View](https://sepolia.etherscan.io/address/0x1c60499FE6531642e4d363423faE51594F447180#code) |
| GreenGovernance | `0xc9c1987DaaF70C63845413AC095dF8f7D2326308` | [View](https://sepolia.etherscan.io/address/0xc9c1987DaaF70C63845413AC095dF8f7D2326308#code) |

All contracts are verified and open-source on Etherscan Sepolia.

### Tech stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.20 + OpenZeppelin 4.9.6 |
| Contract tooling | Hardhat 2 + hardhat-toolbox |
| Soulbound tokens | ERC-721 + ERC-5192 |
| Governance | Custom DAO with timelock |
| Evidence storage | IPFS via Pinata |
| Frontend | Next.js + Ethers.js v6 |
| Network | Ethereum Sepolia Testnet |

---

## Core flow

```
Citizen presents wallet address at collection point
        ↓
Operator fills form: category, weight, location, photo
        ↓
Photo uploaded to IPFS → metadata JSON uploaded to IPFS → CID returned
        ↓
registerDiscard() called on GreenRegistry contract
        ↓
Action stored on-chain (operator, citizen, category, weight, CID, timestamp)
        ↓
GreenSBT.mint() called automatically → SBT issued to citizen wallet
        ↓
DiscardRegistered event emitted → visible on public dashboard
```

## Governance flow

```
Operator submits membership or management proposal
        ↓
Proposal metadata uploaded to IPFS → CID stored on-chain
        ↓
Voting window opens (5 minutes on testnet)
        ↓
Registered voters cast Yes or No votes on-chain
        ↓
Voting window closes → proposal state updated (Passed or Rejected)
        ↓
Timelock expires (1 minute on testnet)
        ↓
Anyone calls executeProposal() → operator added/removed automatically
OR owner calls acknowledgeManagementProposal() → decision recorded on-chain
```

---

## Smart contracts

### GreenRegistry.sol
The core contract. Manages authorized operators and stores discard actions.

Key functions:
- `registerDiscard(citizen, category, weightKg, ipfsCid)` — registers an action and triggers SBT mint. Only callable by authorized operators.
- `getDiscard(id)` — returns full details of a discard action by ID
- `getDiscardsByCitizen(address)` — returns all discard IDs for a given citizen
- `addOperator(address)` / `removeOperator(address)` — callable by owner or governance contract

### GreenSBT.sol
ERC-721 token with ERC-5192 soulbound implementation. Tokens are permanently non-transferable.

Key functions:
- `mint(to, discardId)` — mints a certificate. Only callable by GreenRegistry.
- `locked(tokenId)` — always returns `true` per ERC-5192
- `getTokensByCitizen(address)` — returns all token IDs for a citizen
- `transferFrom` / `safeTransferFrom` / `approve` — all revert with explicit soulbound error

### GreenGovernance.sol
On-chain DAO for operator management and rule proposals.

Key functions:
- `submitMembershipProposal(target, isAddition, ipfsCid)` — propose adding or removing an operator
- `submitManagementProposal(ipfsCid)` — propose a rule or process change
- `castVote(proposalId, support)` — cast a yes or no vote
- `executeProposal(proposalId)` — execute a passed membership proposal after timelock
- `acknowledgeManagementProposal(proposalId)` — owner acknowledges a passed management proposal
- `optInToGovernance()` / `optOutOfGovernance()` — manage voter participation

Governance parameters (testnet):
- Voting duration: 5 minutes
- Timelock: 1 minute
- Quorum: min(2, active voter count) yes votes required

---

## How to run locally

### Prerequisites
- Node.js 18 or 20
- MetaMask browser extension
- Sepolia testnet ETH (available from [sepoliafaucet.com](https://sepoliafaucet.com))

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/greenchain
cd greenchain
```

### 2. Install contract dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the project root:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-alchemy-key
PRIVATE_KEY=your-wallet-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

### 4. Run contract tests
```bash
npx hardhat test
```

All 19 tests should pass.

### 5. Install frontend dependencies
```bash
cd frontend
npm install
```

### 6. Set up frontend environment variables
Create `frontend/.env.local`:
```
PINATA_JWT=your-pinata-jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-alchemy-key
GEMINI_API_KEY=your-gemini-api-key
```

### 7. Run the frontend
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pages

| Page | URL | Description |
|---|---|---|
| Home | `/` | Landing page with project overview |
| Register | `/register` | Operator registers a discard action with AI photo validation |
| My Certificates | `/certificates` | Citizen views their recycling history and SBTs |
| Certificate | `/certificate/[tokenId]` | Public shareable certificate page |
| Dashboard | `/dashboard` | Public audit log with metrics and search |
| Governance | `/governance` | DAO voting on membership and management proposals |
| Propose | `/governance/propose` | Submit a governance proposal |
| Admin | `/admin` | Contract owner manages operators directly |

---

## Audit trail

Every action registered on GreenChain can be independently verified by anyone:

1. Find the action on the [dashboard](http://localhost:3000/dashboard)
2. Click "Etherscan →" to see the on-chain transaction
3. Open the "Logs" tab on Etherscan to see the `DiscardRegistered` event
4. Copy the `ipfsCid` from the event data
5. Open `https://gateway.pinata.cloud/ipfs/<cid>` to see the full metadata JSON
6. Copy `photo.cid` from the JSON
7. Open `https://gateway.pinata.cloud/ipfs/<photo-cid>` to see the original evidence photo

This chain — **transaction → event → metadata CID → photo CID** — is tamper-evident. The CID is a cryptographic hash of the content; any modification to the file would produce a different CID that no longer matches the on-chain record.

---

## Project structure

```
greenchain/
├── contracts/
│   ├── GreenRegistry.sol     ← core registry contract
│   ├── GreenSBT.sol          ← soulbound token contract
│   └── GreenGovernance.sol   ← DAO governance contract
├── scripts/
│   └── deploy.cjs            ← deployment script
├── test/
│   └── GreenChain.cjs        ← 19 unit tests
├── hardhat.config.cjs
├── frontend/
│   ├── lib/
│   │   ├── contracts.js      ← ABIs and addresses
│   │   ├── useWallet.js      ← MetaMask connection hook
│   │   ├── pinata.js         ← Pinata client
│   │   ├── uploadEvidence.js ← server-side upload logic
│   │   ├── uploadClient.js   ← browser-side upload helper
│   │   └── validateImage.js  ← AI image validation helper
│   ├── pages/
│   │   ├── index.js          ← landing page
│   │   ├── register.js       ← operator registration screen
│   │   ├── certificates.js   ← citizen wallet screen
│   │   ├── dashboard.js      ← public dashboard
│   │   ├── admin.js          ← owner admin panel
│   │   ├── certificate/
│   │   │   └── [tokenId].js  ← shareable certificate page
│   │   ├── governance/
│   │   │   ├── index.js      ← governance voting page
│   │   │   └── propose.js    ← proposal submission page
│   │   └── api/
│   │       ├── upload.js         ← evidence IPFS upload
│   │       ├── upload-proposal.js ← proposal IPFS upload
│   │       └── validate-image.js  ← AI image validation
│   └── styles/
└── README.md
```

---

## What is not included

Per the challenge scope, the following are intentionally out of scope for this MVP:

- Tokens with real financial value
- Mobile application
- Production deployment
- Integration with public registries or government databases
- Professional smart contract audit

---

## AI use

This project made use of the AI tools Claude, Cursor and AntiGravity to aid in the coding tasks, as well as Google Gemini for helping with the pitch and presentation.
The entire process was directed by a human in a step-by-step basis, who only used the AI tools as a help to reach the desired quality with the available amount of time.

---

## License

MIT
