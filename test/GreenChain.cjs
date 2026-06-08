const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenChain", function () {
  let registry, sbt;
  let owner, operator, citizen, stranger;

  // WasteCategory enum values
  const Category = { Plastic: 0, Paper: 1, Metal: 2, Glass: 3, Organic: 4 };
  const FAKE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

beforeEach(async function () {
    [owner, operator, citizen, stranger] = await ethers.getSigners();

    const SBT = await ethers.getContractFactory("GreenSBT");
    sbt = await SBT.deploy();
    await sbt.waitForDeployment();

    const Registry = await ethers.getContractFactory("GreenRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    await registry.setSBTContract(await sbt.getAddress());
    await sbt.setRegistryContract(await registry.getAddress());

    await registry.addOperator(operator.address);
});


  // ─── Registration ──────────────────────────────────────────────────────────

  it("allows an operator to register a discard", async function () {
    await expect(
      registry.connect(operator).registerDiscard(
        citizen.address,
        Category.Plastic,
        10,
        FAKE_CID
      )
    ).to.emit(registry, "DiscardRegistered");

    const discard = await registry.getDiscard(0);
    expect(discard.citizen).to.equal(citizen.address);
    expect(discard.weightKg).to.equal(10);
    expect(discard.ipfsCid).to.equal(FAKE_CID);
  });

  it("rejects registration from an unauthorized address", async function () {
    await expect(
      registry.connect(stranger).registerDiscard(
        citizen.address,
        Category.Plastic,
        10,
        FAKE_CID
      )
    ).to.be.revertedWith("GreenRegistry: caller is not an operator");
  });

  it("rejects registration with zero weight", async function () {
    await expect(
      registry.connect(operator).registerDiscard(
        citizen.address,
        Category.Plastic,
        0,
        FAKE_CID
      )
    ).to.be.revertedWith("GreenRegistry: weight must be greater than zero");
  });

  it("rejects registration with empty CID", async function () {
    await expect(
      registry.connect(operator).registerDiscard(
        citizen.address,
        Category.Plastic,
        10,
        ""
      )
    ).to.be.revertedWith("GreenRegistry: IPFS CID required");
  });

  // ─── SBT minting ───────────────────────────────────────────────────────────

  it("mints an SBT to the citizen after registration", async function () {
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Paper, 5, FAKE_CID
    );

    const tokens = await sbt.getTokensByCitizen(citizen.address);
    expect(tokens.length).to.equal(1);
    expect(await sbt.ownerOf(0)).to.equal(citizen.address);
  });

  it("marks the SBT as locked (soulbound)", async function () {
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Metal, 3, FAKE_CID
    );
    expect(await sbt.locked(0)).to.equal(true);
  });

  it("reverts on attempt to transfer the SBT", async function () {
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Glass, 2, FAKE_CID
    );
    await expect(
      sbt.connect(citizen).transferFrom(citizen.address, stranger.address, 0)
    ).to.be.revertedWith("GreenSBT: token is soulbound and cannot be transferred");
  });

  it("reverts on attempt to approve the SBT", async function () {
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Organic, 1, FAKE_CID
    );
    await expect(
      sbt.connect(citizen).approve(stranger.address, 0)
    ).to.be.revertedWith("GreenSBT: token is soulbound and cannot be approved");
  });

  // ─── Operator management ───────────────────────────────────────────────────

  it("allows owner to add and remove operators", async function () {
    await registry.addOperator(stranger.address);
    expect(await registry.operators(stranger.address)).to.equal(true);

    await registry.removeOperator(stranger.address);
    expect(await registry.operators(stranger.address)).to.equal(false);
  });

  it("prevents non-owner from adding operators", async function () {
    await expect(
      registry.connect(stranger).addOperator(stranger.address)
    ).to.be.reverted;
  });

  // ─── Query functions ───────────────────────────────────────────────────────

  it("tracks multiple discards per citizen", async function () {
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Plastic, 5, FAKE_CID
    );
    await registry.connect(operator).registerDiscard(
      citizen.address, Category.Paper, 3, FAKE_CID
    );

    const ids = await registry.getDiscardsByCitizen(citizen.address);
    expect(ids.length).to.equal(2);

    const tokens = await sbt.getTokensByCitizen(citizen.address);
    expect(tokens.length).to.equal(2);
  });

  it("reverts when querying a non-existent discard", async function () {
    await expect(registry.getDiscard(999)).to.be.revertedWith(
      "GreenRegistry: discard does not exist"
    );
  });
});
