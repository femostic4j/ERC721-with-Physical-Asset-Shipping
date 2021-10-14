const FemiToken = artifacts.require("FemiToken");

module.exports = function (deployer) {
  deployer.deploy(FemiToken);
};