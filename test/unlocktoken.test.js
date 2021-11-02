const FemiToken = artifacts.require('FemiToken');
const truffleAssert = require('truffle-assertions');

let correctUnlockCode = web3.utils.sha3('test'); //test is the password
let timestampLockedFrom = Math.round(Date.now() / 1000) + 3; //lock it in 3 seconds to test unlock
let unlockCodeHash = web3.utils.sha3(correctUnlockCode); //double hashed

contract('FemiToken: test mint and lock', (accounts) => {
    const [deployerAddress, tokenHolderOneAddress, tokenHolderTwoAddress] = accounts;

    it('is possible to mint tokens for the minter role', async () => {
        let token = await FemiToken.deployed();

        await token.mint(tokenHolderOneAddress, timestampLockedFrom, unlockCodeHash); //minting works
        await truffleAssert.fails(token.transferFrom(deployerAddress, tokenHolderOneAddress, 0)); //transferring for others doesn't work

        //but transferring in general works
        await truffleAssert.passes(
            token.transferFrom(tokenHolderOneAddress, tokenHolderTwoAddress, 0, { from: tokenHolderOneAddress }),
        );
    });

    it('is not possible to transfer locked tokens', async () => {
        //unless we wait 4 seconds and the token will be locked
        let token = await FemiToken.deployed();
        await new Promise((res) => {
            setTimeout(res, 4000);
        });
        await truffleAssert.fails(
            token.transferFrom(tokenHolderTwoAddress, tokenHolderOneAddress, 0, { from: tokenHolderTwoAddress }),
            truffleAssert.ErrorType.REVERT,
            'FemiToken: Token locked',
        );
    });

    it('is not possible to unlock tokens for anybody else than the token holder', async () => {
        let token = await FemiToken.deployed();
        await truffleAssert.fails(
            token.unlockToken(correctUnlockCode, 0, { from: deployerAddress }),
            truffleAssert.ErrorType.REVERT,
            'FemiToken: Only the Owner can unlock the Token',
        );
    });

    it('is not possible to unlock tokens without the correct unlock code', async () => {
        let token = await FemiToken.deployed();
        let wrongUnlockCode = web3.utils.sha3('Santa Lucia');
        await truffleAssert.fails(
            token.unlockToken(wrongUnlockCode, 0, { from: tokenHolderTwoAddress }),
            truffleAssert.ErrorType.REVERT,
            'FemiToken: Unlock Code Incorrect',
        );
    });

    it('is possible to unlock the token and transfer it again', async () => {
        let token = await FemiToken.deployed();
        await truffleAssert.passes(token.unlockToken(correctUnlockCode, 0, { from: tokenHolderTwoAddress }));
        await truffleAssert.passes(
            token.transferFrom(tokenHolderTwoAddress, deployerAddress, 0, { from: tokenHolderTwoAddress }),
        );
        let tokenOwner = await token.ownerOf(0);
        assert.equal(tokenOwner, deployerAddress, 'The Owner is not the correct address');
    });

    it('is possible to retrieve the correct token URI', async () => {
        let token = await FemiToken.deployed();
        let metadata = await token.tokenURI(0);
        assert.equal('https://femi.art/metadata/0.json', metadata);
    })
});