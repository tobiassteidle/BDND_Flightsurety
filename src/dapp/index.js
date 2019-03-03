
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {
        let self = this;

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error ? error : "", "Operational Status: " + result);

            let flights = [
                {
                    time: "09:15",
                    target: "Aberdeen",
                    fn: "BD674",
                    status: "Delayed"
                },
                {
                    time: "09:45",
                    target: "Newcastle",
                    fn: "BA1326",
                    status: "Cancelled"
                },
                {
                    time: "09:55",
                    target: "Glasgow",
                    fn: "BA1476",
                    status: "Cancelled"
                },
                {
                    time: "09:55",
                    target: "Durham Tees",
                    fn: "GF5232",
                    status: "On Time"
                },
                {
                    time: "10:05",
                    target: "Dublin",
                    fn: "AA7991",
                    status: "Delayed"
                },
                {
                    time: "10:10",
                    target: "Shannon",
                    fn: "AA8017",
                    status: "Cancelled"
                },
                {
                    time: "10:35",
                    target: "Edinburgh",
                    fn: "BA1447",
                    status: "On Time"
                }
            ];


           // flights = null;

            function registerFlight(flight){
                contract.registerFlight(flight, () => {
                    console.log("DANONE");
                })
            }


            displayFlightplan( 'Operational Status', 'Check if contract is operational', flights, [ { label: 'Operational Status', error: error, value: result} ], registerFlight);
        });

/*
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
*/
        contract.oracleReport(result => {
           console.log(JSON.stringify(result));
        });

        contract.flightStatusInfo(result => {
            console.log("*** VERIFIED: " + JSON.stringify(result) + " ****");
        });



    });

})();


function displayFlightplan(title, description, flights, status, registerFlightCallback) {
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";

    // Available Flights
    let sectionFlightPlan = DOM.section();
    sectionFlightPlan.appendChild(DOM.h2("Flightplan"));

    if(flights !== null){
        sectionFlightPlan.appendChild(DOM.h5("Currently available flights"));

        flights.map((flight) => {
            let row = sectionFlightPlan.appendChild(DOM.div({className:'row'}));
            row.appendChild(DOM.div({className: 'col-sm-1 field-value'}, flight.time));
            row.appendChild(DOM.div({className: 'col-sm-1 field-value'}, flight.fn));
            row.appendChild(DOM.div({className: 'col-sm-2 field-value'}, flight.target));
            row.appendChild(DOM.div({className: 'col-sm-2 field'}, flight.status));


            let buttonInsuring = DOM.button({className: 'btn btn-primary', id: 'dasfsdf'}, "Register insuring");
            buttonInsuring.addEventListener('click', () => {
                registerFlightCallback(flight.fn);
            });
            row.appendChild(buttonInsuring);
/*

            time: "09:45",
              target: "Newcastle",
              fn: "BA1326",
              status: "Cancelled"
  */

            sectionFlightPlan.appendChild(row);
        })

    } else {
        sectionFlightPlan.appendChild(DOM.h5("Loading available Flights..."));
    }


    /*

*/
    /*
<div class="row top-20">
      <label class="form">Flight</label> <input type="text" id="flight-number"> <btn class="btn btn-primary" id="submit-oracle">Submit to Oracles</btn>
    </div>*/

    displayDiv.append(sectionFlightPlan);

    // Operational Status
    let sectionOperationalStatus = DOM.section();
    sectionOperationalStatus.appendChild(DOM.h4(title));
    sectionOperationalStatus.appendChild(DOM.h5(description));
    status.map((result) => {
        let row = sectionOperationalStatus.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        sectionOperationalStatus.appendChild(row);
    })
    displayDiv.append(sectionOperationalStatus);
}







