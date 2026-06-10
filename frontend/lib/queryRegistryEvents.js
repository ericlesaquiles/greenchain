import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI, DEPLOY_BLOCK } from "./contracts";

const FALLBACK_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
// Public nodes typically allow much larger log ranges than Alchemy free tier.
const PUBLIC_LOG_CHUNK_SIZE = 50000;

async function fetchTxHashesFromLogs() {
  const provider = new ethers.JsonRpcProvider(FALLBACK_RPC);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const filter = registry.filters.DiscardRegistered();
  const latestBlock = await provider.getBlockNumber();

  const txById = new Map();

  for (let from = DEPLOY_BLOCK; from <= latestBlock; from += PUBLIC_LOG_CHUNK_SIZE) {
    const to = Math.min(from + PUBLIC_LOG_CHUNK_SIZE - 1, latestBlock);
    const events = await registry.queryFilter(filter, from, to);
    for (const event of events) {
      txById.set(event.args.id.toString(), event.transactionHash);
    }
  }

  return txById;
}

async function fetchDiscardsFromContract(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl || FALLBACK_RPC);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const count = Number(await registry.discardCount());
  if (count === 0) return [];

  return Promise.all(
    Array.from({ length: count }, async (_, id) => {
      const discard = await registry.getDiscard(id);
      return {
        id: id.toString(),
        operator: discard.operator,
        citizen: discard.citizen,
        category: Number(discard.category),
        weightKg: Number(discard.weightKg),
        ipfsCid: discard.ipfsCid,
        timestamp: Number(discard.timestamp),
        txHash: null,
      };
    })
  );
}

export async function queryDiscardRegisteredEvents(rpcUrl) {
  const [discards, txById] = await Promise.all([
    fetchDiscardsFromContract(rpcUrl),
    fetchTxHashesFromLogs().catch((err) => {
      console.warn("Could not fetch transaction hashes from logs:", err.message);
      return new Map();
    }),
  ]);

  for (const discard of discards) {
    discard.txHash = txById.get(discard.id) ?? null;
  }

  return discards;
}
