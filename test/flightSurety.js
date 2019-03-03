var Web3Utils = require('web3-utils');
var Web3 = require('web3')
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  it(`(security) caller not authorized`,async function () {
    let result = await config.flightSuretyData.isAuthorizedCaller(config.flightSuretyApp.address);
    assert.equal(result, false, "Caller is authorized although was not been registered.");
  });

  it(`(security) caller authorized`,async function () {
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    let result = await config.flightSuretyData.isAuthorizedCaller(config.flightSuretyApp.address);
    assert.equal(result, true, "Caller is not authorized although was registered.");
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(initial) first airline is registered when contract is deployed.`, async function () {
      let result = await config.flightSuretyData.isAirline.call(config.firstAirline);
      assert.equal(result, true, "First airline not registred on deployment");
  });

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      let status = true;
      try
      {
          status = await config.flightSuretyApp.isOperational.call();
          await config.flightSuretyApp.registerFlight();
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");
      assert.equal(status, false, "Contract is operational");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    let reverted = false;
    try {
        await config.flightSuretyApp.registerAirline.call(newAirline, {from: config.firstAirline});
    }
    catch(e) {
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, true, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) fund first airline (seed fund to low)', async () => {

    // ACT
    let reverted = false;
    try {
        await config.flightSuretyApp.fund.call({from: config.firstAirline, value: Web3Utils.toWei("9.9", "ether"), gasPrice: 0});
    }
    catch(e) {
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, true, "Airline seed fund should reach the minimum of 10 ether.");
  });

  it('(airline) fund first airline (seed reached)', async () => {

    // ACT
    let reverted = false;
    let balance = 0;
    try {
        await config.flightSuretyApp.fund({from: config.firstAirline, value: Web3Utils.toWei("10", "ether"), gasPrice: 0});
        balance = await config.flightSuretyData.getBalance({from: config.owner});
    }
    catch(e) {
        console.log(e);
        reverted = true;
    }

    // ASSERT
    assert.equal(balance.toString(10), Web3Utils.toWei("10", "ether"), "Unexcected Airline balance");
    assert.equal(reverted, false, "Airline seed not accepted");
  });

  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    let reverted = false;
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, false, "Airline should be able to register another airline");
  });

  it('(airline) prevent registerAirline() on already registred airline', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    let reverted = false;
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, true, "Airline should not be registred twice");
  });

  it('(airline) can register airlines until mulitparty consensus threshold is reached', async () => {

    // ARRANGE
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];
    let newAirline4 = accounts[5];

    // ACT
    let registerBelowThreshold = true;

    try {
        await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline3, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline4, {from: config.firstAirline});
    }
    catch(e) {
        registerBelowThreshold = false;
        console.log(e);
    }

    // ASSERT
    assert.equal(registerBelowThreshold, true, "Can not register Airlines but should work");
    assert.equal(await config.flightSuretyApp.airlinesRegisteredCount.call(), 4, "Threshold ignored");
  });

});
