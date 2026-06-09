const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenChain", function () {
  let registry, sbt, governance;
  let owner, operator, operator2, citizen, stranger;

  const Category = { Plastic: 0, Paper: 1, Metal: 2, Glass: 3, Organic: 4 };
  const FAKE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const VOTING_DURATION = 60;  // 1 minute for tests
  const TIMELOCK_DURATION = 10; // 10 seconds for tests

  beforeEach(async function () {
    [owner, operator, operator2, citizen, stranger] = await ethers.getSigners();

    const SBT = await ethers.getContractFactory("GreenSBT");
    sbt = await SBT.deploy();
    await sbt.waitForDeployment();

    const Registry = await ethers.getContractFactory("GreenRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Governance = await ethers.getContractFactory("GreenGovernance");
    governance = await Governance.deploy(
      await registry.getAddress(),
      VOTING_DURATION,
      TIMELOCK_DURATION
    );
    await governance.waitForDeployment();

    await registry.setSBTContract(await sbt.getAddress());
    await sbt.setRegistryContract(await registry.getAddress());
    await registry.setGovernanceContract(await governance.getAddress());
    await registry.addOperator(operator.address);
  });

  // ─── Registry tests ────────────────────────────────────────────────────────

  describe("GreenRegistry", function () {
    it("allows an operator to register a discard", async function () {
      await expect(
        registry.connect(operator).registerDiscard(
          citizen.address, Category.Plastic, 10, FAKE_CID
        )
      ).to.emit(registry, "DiscardRegistered");

      const discard = await registry.getDiscard(0);
      expect(discard.citizen).to.equal(citizen.address);
      expect(discard.weightKg).to.equal(10);
    });

    it("rejects registration from unauthorized address", async function () {
      await expect(
        registry.connect(stranger).registerDiscard(
          citizen.address, Category.Plastic, 10, FAKE_CID
        )
      ).to.be.revertedWith("GreenRegistry: caller is not an operator");
    });

    it("rejects registration with zero weight", async function () {
      await expect(
        registry.connect(operator).registerDiscard(
          citizen.address, Category.Plastic, 0, FAKE_CID
        )
      ).to.be.revertedWith("GreenRegistry: weight must be greater than zero");
    });

    it("allows governance contract to add operators", async function () {
      await registry.setGovernanceContract(owner.address);
      await registry.connect(owner).addOperator(stranger.address);
      expect(await registry.operators(stranger.address)).to.equal(true);
    });
  });

  // ─── SBT tests ─────────────────────────────────────────────────────────────

  describe("GreenSBT", function () {
    it("mints an SBT after registration", async function () {
      await registry.connect(operator).registerDiscard(
        citizen.address, Category.Paper, 5, FAKE_CID
      );
      const tokens = await sbt.getTokensByCitizen(citizen.address);
      expect(tokens.length).to.equal(1);
    });

    it("marks SBT as locked", async function () {
      await registry.connect(operator).registerDiscard(
        citizen.address, Category.Metal, 3, FAKE_CID
      );
      expect(await sbt.locked(0)).to.equal(true);
    });

    it("reverts on transfer attempt", async function () {
      await registry.connect(operator).registerDiscard(
        citizen.address, Category.Glass, 2, FAKE_CID
      );
      await expect(
        sbt.connect(citizen).transferFrom(citizen.address, stranger.address, 0)
      ).to.be.revertedWith("GreenSBT: token is soulbound and cannot be transferred");
    });
  });

  // ─── Governance tests ──────────────────────────────────────────────────────

  describe("GreenGovernance", function () {

    beforeEach(async function () {
      // operator opts in to governance
      await governance.connect(operator).optInToGovernance();
    });

    it("allows an operator to opt in to governance", async function () {
      expect(await governance.isVoter(operator.address)).to.equal(true);
    });

    it("prevents non-operators from opting in", async function () {
      await expect(
        governance.connect(stranger).optInToGovernance()
      ).to.be.revertedWith("GreenGovernance: caller is not an operator");
    });

    it("allows submitting a membership proposal", async function () {
      await expect(
        governance.connect(operator).submitMembershipProposal(
          stranger.address, true, FAKE_CID
        )
      ).to.emit(governance, "ProposalSubmitted");

      const proposal = await governance.getProposal(0);
      expect(proposal.target).to.equal(stranger.address);
      expect(proposal.isAddition).to.equal(true);
    });

    it("allows submitting a management proposal", async function () {
      await expect(
        governance.connect(operator).submitManagementProposal(FAKE_CID)
      ).to.emit(governance, "ProposalSubmitted");
    });

    it("allows a voter to cast a vote", async function () {
      await governance.connect(operator).submitMembershipProposal(
        stranger.address, true, FAKE_CID
      );
      await expect(
        governance.connect(operator).castVote(0, true)
      ).to.emit(governance, "VoteCast");

      const proposal = await governance.getProposal(0);
      expect(proposal.yesVotes).to.equal(1);
    });

    it("prevents double voting", async function () {
      await governance.connect(operator).submitMembershipProposal(
        stranger.address, true, FAKE_CID
      );
      await governance.connect(operator).castVote(0, true);
      await expect(
        governance.connect(operator).castVote(0, true)
      ).to.be.revertedWith("GreenGovernance: already voted");
    });

    it("prevents target from voting on their own membership proposal", async function () {
      // add operator2 as operator and voter
      await registry.addOperator(operator2.address);
      await governance.connect(operator2).optInToGovernance();

      await governance.connect(operator).submitMembershipProposal(
        operator2.address, false, FAKE_CID
      );

      await expect(
        governance.connect(operator2).castVote(0, true)
      ).to.be.revertedWith("GreenGovernance: cannot vote on own proposal");
    });

    it("executes a passed membership proposal after timelock", async function () {
      // add a second operator and voter for quorum
      await registry.addOperator(operator2.address);
      await governance.connect(operator2).optInToGovernance();

      await governance.connect(operator).submitMembershipProposal(
        stranger.address, true, FAKE_CID
      );

      await governance.connect(operator).castVote(0, true);
      await governance.connect(operator2).castVote(0, true);

      // advance time past deadline + timelock
      await ethers.provider.send("evm_increaseTime", [VOTING_DURATION + TIMELOCK_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        governance.executeProposal(0)
      ).to.emit(governance, "ProposalExecuted");

      expect(await registry.operators(stranger.address)).to.equal(true);
    });

    it("rejects execution before timelock expires", async function () {
      await registry.addOperator(operator2.address);
      await governance.connect(operator2).optInToGovernance();

      await governance.connect(operator).submitMembershipProposal(
        stranger.address, true, FAKE_CID
      );
      await governance.connect(operator).castVote(0, true);
      await governance.connect(operator2).castVote(0, true);

      // advance time past deadline but NOT past timelock
      await ethers.provider.send("evm_increaseTime", [VOTING_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        governance.executeProposal(0)
      ).to.be.revertedWith("GreenGovernance: timelock not expired");
    });


    it("rejects a proposal that doesn't meet quorum", async function () {
      // two voters registered, but only one votes yes — not enough for quorum
      await registry.addOperator(operator2.address);
      await governance.connect(operator2).optInToGovernance();

      await governance.connect(operator).submitMembershipProposal(
        stranger.address, true, FAKE_CID
      );

      // only operator votes yes, operator2 abstains
      await governance.connect(operator).castVote(0, true);

      await ethers.provider.send("evm_increaseTime", [VOTING_DURATION + TIMELOCK_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        governance.executeProposal(0)
      ).to.be.revertedWith("GreenGovernance: proposal did not pass");
    });

    it("owner can acknowledge a passed management proposal", async function () {
      await registry.addOperator(operator2.address);
      await governance.connect(operator2).optInToGovernance();

      await governance.connect(operator).submitManagementProposal(FAKE_CID);
      await governance.connect(operator).castVote(0, true);
      await governance.connect(operator2).castVote(0, true);

      await ethers.provider.send("evm_increaseTime", [VOTING_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        governance.connect(owner).acknowledgeManagementProposal(0)
      ).to.emit(governance, "ProposalAcknowledged");
    });

    it("allows opting out of governance", async function () {
      await governance.connect(operator).optOutOfGovernance();
      expect(await governance.isVoter(operator.address)).to.equal(false);
    });
  });
});
