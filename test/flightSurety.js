var Web3Utils = require('web3-utils');

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
    let status = await config.flightSuretyData.isOperational.call();
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
      try
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

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
        reverted = true;
    }

    // ASSERT
    assert.equal(balance.toNumber(), Web3Utils.toWei("10", "ether"), "Unexcected Airline balance");
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
    let newAirline5 = accounts[6];

    let airline2Status = null;
    let airline3Status = null;
    let airline4Status = null;
    let airline5Status = null;

    // ACT
    let registerBelowThreshold = true;

    try {
        airline2Status = await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        airline3Status = await config.flightSuretyApp.registerAirline(newAirline3, {from: config.firstAirline});
        airline4Status = await config.flightSuretyApp.registerAirline(newAirline4, {from: config.firstAirline});
        airline5Status = await config.flightSuretyApp.registerAirline(newAirline5, {from: config.firstAirline});
    }
    catch(e) {
        registerBelowThreshold = false;
        console.log(e);
    }

      console.log(await config.flightSuretyApp.airlinesRegisteredCount.call());
/*
      console.log(airline2Status[2].toNumber() + " " + airline2Status[3]);
      console.log(airline3Status[2].toNumber() + " " + airline3Status[3]);
      console.log(airline4Status[2].toNumber() + " " + airline4Status[3]);
      console.log(airline5Status[2].toNumber() + " " + airline5Status[3]);

    // ASSERT
    assert.equal(registerBelowThreshold, true, "Can not register Airlines but should work");
    assert.equal(airline2Status[0], true, "Can not register Airline 2");
    assert.equal(airline3Status[0], true, "Can not register Airline 3");
    assert.equal(airline4Status[0], true, "Can not register Airline 4");
    assert.equal(airline5Status[0], false, "Threshold reached for Airline 5");
*/

  });

});
