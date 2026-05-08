import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';
import { FhevmType } from '@fhevm/hardhat-plugin';
import { PredqCredit } from '../typechain-types';

describe('PredqCredit', function () {
  let credit: PredqCredit;
  let owner: any, alice: any, bob: any, market: any;

  beforeEach(async function () {
    [owner, alice, bob, market] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PredqCredit');
    credit = (await Factory.deploy()) as PredqCredit;
    await credit.waitForDeployment();
  });

  describe('constants', function () {
    it('exposes name + symbol + decimals', async function () {
      expect(await credit.name()).to.equal('Prediqt Credit');
      expect(await credit.symbol()).to.equal('PREDQ');
      expect(await credit.decimals()).to.equal(6);
    });

    it('SIGNUP_AMOUNT is 1000 PREDQ', async function () {
      expect(await credit.SIGNUP_AMOUNT()).to.equal(1_000_000_000n);
    });
  });

  describe('claimSignupCredits', function () {
    it('mints SIGNUP_AMOUNT to a new user', async function () {
      await credit.connect(alice).claimSignupCredits();

      const handle = await credit.confidentialBalanceOf(alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        handle,
        await credit.getAddress(),
        alice,
      );
      expect(balance).to.equal(1_000_000_000n);
      expect(await credit.hasClaimedSignup(alice.address)).to.equal(true);
    });

    it('reverts on second claim', async function () {
      await credit.connect(alice).claimSignupCredits();
      await expect(credit.connect(alice).claimSignupCredits()).to.be.revertedWith(
        'already claimed',
      );
    });

    it('different users get separate balances', async function () {
      await credit.connect(alice).claimSignupCredits();
      await credit.connect(bob).claimSignupCredits();

      const aliceBal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(alice.address),
        await credit.getAddress(),
        alice,
      );
      const bobBal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(bob.address),
        await credit.getAddress(),
        bob,
      );
      expect(aliceBal).to.equal(1_000_000_000n);
      expect(bobBal).to.equal(1_000_000_000n);
    });
  });

  describe('claimFaucet', function () {
    it('reverts if user has not signed up', async function () {
      await expect(credit.connect(alice).claimFaucet()).to.be.revertedWith('sign up first');
    });

    it('mints FAUCET_AMOUNT after signup', async function () {
      await credit.connect(alice).claimSignupCredits();
      await credit.connect(alice).claimFaucet();

      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(alice.address),
        await credit.getAddress(),
        alice,
      );
      expect(balance).to.equal(1_000_000_000n + 100_000_000n);
    });

    it('enforces 7-day cooldown', async function () {
      await credit.connect(alice).claimSignupCredits();
      await credit.connect(alice).claimFaucet();
      await expect(credit.connect(alice).claimFaucet()).to.be.revertedWith('cooldown');

      await ethers.provider.send('evm_increaseTime', [7 * 24 * 3600]);
      await ethers.provider.send('evm_mine', []);
      await credit.connect(alice).claimFaucet();
    });
  });

  describe('confidentialTransfer', function () {
    beforeEach(async function () {
      await credit.connect(alice).claimSignupCredits();
    });

    it('transfers an encrypted amount', async function () {
      const transferAmount = 250_000_000n; // 250 PREDQ
      const enc = await fhevm
        .createEncryptedInput(await credit.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      await credit
        .connect(alice)
        .confidentialTransfer(bob.address, enc.handles[0], enc.inputProof);

      const aliceBal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(alice.address),
        await credit.getAddress(),
        alice,
      );
      const bobBal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(bob.address),
        await credit.getAddress(),
        bob,
      );
      expect(aliceBal).to.equal(750_000_000n);
      expect(bobBal).to.equal(250_000_000n);
    });

    it('silently zeroes a transfer that exceeds balance', async function () {
      const tooMuch = 999_999_999_999n;
      const enc = await fhevm
        .createEncryptedInput(await credit.getAddress(), alice.address)
        .add64(tooMuch)
        .encrypt();

      await credit
        .connect(alice)
        .confidentialTransfer(bob.address, enc.handles[0], enc.inputProof);

      const aliceBal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await credit.confidentialBalanceOf(alice.address),
        await credit.getAddress(),
        alice,
      );
      expect(aliceBal).to.equal(1_000_000_000n);
    });
  });

  describe('authorized spender', function () {
    it('only owner can whitelist', async function () {
      await expect(
        credit.connect(alice).setAuthorizedSpender(market.address, true),
      ).to.be.revertedWith('not owner');
    });

    it('rejects unauthorized confidentialTransferFrom', async function () {
      await credit.connect(alice).claimSignupCredits();
      const enc = await fhevm
        .createEncryptedInput(await credit.getAddress(), market.address)
        .add64(100n)
        .encrypt();
      await expect(
        credit
          .connect(market)
          .confidentialTransferFrom(alice.address, bob.address, enc.handles[0], enc.inputProof),
      ).to.be.revertedWith('not authorized spender');
    });
  });
});
