var Web3Utils = require('web3-utils');
var Web3 = require('web3')
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  const ORACLES_COUNT = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;

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
    let fund = await config.flightSuretyApp.AIRLINE_SEED_FUND.call();

    // ACT
    let reverted = false;
    try {
        await config.flightSuretyApp.fund.call({from: config.firstAirline, value: fund.toNumber()-1, gasPrice: 0});
    }
    catch(e) {
        reverted = true;
    }

    // ASSERT
    assert.equal(reverted, true, "Airline seed fund should reach the minimum of 10 ether.");
  });

  it('(airline) fund first airline (seed reached)', async () => {
    let fund = await config.flightSuretyApp.AIRLINE_SEED_FUND.call();

    // ACT
    let reverted = false;
    let balance = 0;
    try {
        await config.flightSuretyApp.fund({from: config.firstAirline, value: fund.toString(), gasPrice: 0});
        balance = await config.flightSuretyData.getBalance({from: config.owner});
    }
    catch(e) {
        console.log(e);
        reverted = true;
    }

    // ASSERT
    assert.equal(balance.toString(10), fund.toString(), "Unexcected Airline balance");
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

  it('(airline) fund airline 2-4 (first is funded)', async () => {

    // ARRANGE
    let fund = await config.flightSuretyApp.AIRLINE_SEED_FUND.call();

    let newAirline = accounts[2];
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];

    // ACT
    let rejected = false;

    try {
        await config.flightSuretyApp.fund({from: newAirline, value: fund.toString(), gasPrice: 0});
        await config.flightSuretyApp.fund({from: newAirline2, value: fund.toString(), gasPrice: 0});
        await config.flightSuretyApp.fund({from: newAirline3, value: fund.toString(), gasPrice: 0});
    }
    catch(e) {
        rejected = true;
    }

    // ASSERT
    assert.equal(rejected, false, "Airlines not founded");
  });

  it('(airline) register 5th Airline - requires multiparty consensus', async () => {

    // ARRANGE
    let fund = await config.flightSuretyApp.AIRLINE_SEED_FUND.call();

    let newAirline = accounts[6];

    let airline2 = accounts[2];
    let airline3 = accounts[3];

    // Register new Airline - shouldn't change anything
    await config.flightSuretyApp.registerAirline(newAirline, {from: airline2});
    assert.equal(await config.flightSuretyApp.airlinesRegisteredCount.call(), 4, "Threshold ignored");

    // Register new Airline - airline 2 vote twice
    let rejectMultivote = false;
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {from: airline2});
    } catch(e) {
      rejectMultivote = true;
    }
    assert.equal(rejectMultivote, true, "Multivote not rejected");
    assert.equal(await config.flightSuretyApp.airlinesRegisteredCount.call(), 4, "Multivote possible");

    // Register new Airline - now airline 2 and airline 3 votes for new airline
    await config.flightSuretyApp.registerAirline(newAirline, {from: airline3});
    assert.equal(await config.flightSuretyApp.airlinesRegisteredCount.call(), 5, "Consensus not reached");
  });

  it('(insurance) Buy insurance for flight (exeeded max payment)', async () => {

    let insuree = accounts[7];
    let airline = accounts[2];
    let flight = 'ND1309';
    let value = Web3Utils.toWei("1.1", "ether");

    let rejected = false;

    try {
      await config.flightSuretyApp.registerFlight(airline, flight, 0, {from: insuree, value: value, gasPrice: 0});
    }
    catch(e) {
      rejected = true;
    }

    // ASSERT
    assert.equal(rejected, true, "Max payment should not exeeded.");
  });

  it('(insurance) Buy insurance for flight', async () => {

    let insuree = accounts[7];
    let airline = accounts[2];
    let flight = 'ND1309';
    let value = Web3Utils.toWei("1", "ether");

    let rejected = false;

    try {
      await config.flightSuretyApp.registerFlight(airline, flight, 0, {from: insuree, value: value, gasPrice: 0});
    }
    catch(e) {
      rejected = true;
      console.log(e);
    }

    // ASSERT
    assert.equal(rejected, false, "Can´t by insurance.");
  });

  it('(insurance) prevent buying more then one insurance for flight', async () => {

    let insuree = accounts[7];
    let airline = accounts[2];
    let flight = 'ND1309';
    let value = Web3Utils.toWei("0.7", "ether");

    let rejected = false;

    try {
      await config.flightSuretyApp.registerFlight(airline, flight, 0, {from: insuree, value: value, gasPrice: 0});
    }
    catch(e) {
      rejected = true;
    }

    // ASSERT
    assert.equal(rejected, true, "Can insure flight more then one time.");
  });


  it('(passenger) check balance should be 0', async () => {
    let insuree = accounts[7];
    let rejected = false;
    let balance = 100;

    try {
      balance = await config.flightSuretyApp.insureeBalance({from: insuree});

    }
    catch(e) {
      rejected = true;
    }

    // ASSERT
    assert.equal(rejected, false, "Failure on check balance.");
    assert.equal(balance.toNumber(), 0, "Invalid balance.");
  });

  it('(oracles) bruteforce submitOracleResponse() to emit processFlightStatus()', async () => {
    console.log("Bruteforce submitOracleResponse() - may take a moment... (sure there is a better way)")
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
    let airline = accounts[2];
    let flight = 'ND1309';

    // ACT
    for(let a = 1; a < ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({from: accounts[a], value: fee});
      await config.flightSuretyApp.fetchFlightStatus(airline, flight, 0, {from: accounts[a]});

      for (let idx = 0; idx < 9; idx++) {
        try {
          await config.flightSuretyApp.submitOracleResponse(idx, airline, flight, 0, STATUS_CODE_LATE_AIRLINE, {from: accounts[a]});
          console.log("Bruteforce successful");
        } catch (e) {
        }
      }
    }
  });

  it('(passenger) check balance after credited (no withdraw)', async () => {
    let insuree = accounts[7];
    let rejected = false;
    let balance = 0;

    try {
      balance = await config.flightSuretyApp.insureeBalance({from: insuree});
    }
    catch(e) {
      rejected = true;
    }

    // ASSERT
    assert.equal(rejected, false, "Failure on check balance.");
    assert.equal(balance.toString(), new BigNumber("1500000000000000000").toString(), "Invalid balance.");
  });

  it('(passenger) withdraw to account', async () => {
    let insuree = accounts[7];
    let initialBalance = await web3.eth.getBalance(insuree);
    let balance = 1000;

    let rejected = false;
    try {
      await config.flightSuretyApp.withdraw({from: insuree});
      balance = await config.flightSuretyApp.insureeBalance({from: insuree});
    }
    catch(e) {
      rejected = true;
      console.log(e);
    }

    let currentBalance = await web3.eth.getBalance(insuree);

    assert.equal(rejected, false, "Failure on withdraw to passanger account.");
    assert.equal(balance.toString(), "0", "Balance should be 0");
    assert.equal(new BigNumber(currentBalance.toString()).isGreaterThan(new BigNumber(initialBalance.toString())), true, "Invalid balance on account");
  });

  it('(passenger) prevent withdraw to account (twice)', async () => {
    let insuree = accounts[7];
    let initialBalance = await web3.eth.getBalance(insuree);

    let rejected = false;
    try {
      await config.flightSuretyApp.withdraw({from: insuree});
    }
    catch(e) {
      rejected = true;
      console.log(e);
    }

    let currentBalance = await web3.eth.getBalance(insuree);

    assert.equal(rejected, false, "Failure on withdraw to passanger account.");
    assert.equal(new BigNumber(currentBalance.toString()).isEqualTo(new BigNumber(initialBalance.toString())), false, "Invalid balance on account");
  });

});
