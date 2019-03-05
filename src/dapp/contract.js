import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    oracleReport(callback) {
       let self = this;
       self.flightSuretyApp.events.OracleReport({}, function(error, event) {
            if(error) {
                console.log(error);
            } else {
                callback(event.returnValues);
            }
        })
   }

    flightStatusInfo(callback) {
        let self = this;
        self.flightSuretyApp.events.FlightStatusInfo({}, function(error, event) {
            if(error) {
                console.log(error);
            } else {
                callback(event.returnValues);
            }
        })
    }

    registerFlight(flight, callback) {
      let self = this;
      self.flightSuretyApp.methods
            .registerFlight(flight.airline, flight.fn, flight.timestamp)
            .send({ from: self.passengers[0], value: "1000000000000000000"}, (error, result) => {
              console.log(error);
                callback(error, result);
              });

      //await config.flightSuretyApp.registerFlight(airline, flight, 0, {from: insuree, value: value, gasPrice: 0});*/

      console.log("REGISTER FLIGHT: " + flight);
      callback();
    }
}
