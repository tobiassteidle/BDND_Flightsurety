
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;


    let available_flights = [
        {
            time: "09:15",
            target: "Aberdeen",
            fn: "BD674",
            status: "0"
        },
        {
            time: "09:45",
            target: "Newcastle",
            fn: "BA1326",
            status: "0"
        },
        {
            time: "09:55",
            target: "Durham Tees",
            fn: "GF5232",
            status: "0"
        },
        {
            time: "10:05",
            target: "Dublin",
            fn: "AA7991",
            status: "0"
        },
        {
            time: "10:10",
            target: "Shannon",
            fn: "AA8017",
            status: "0"
        }
    ];

    function resolveFlight(flightnr) {
        for(let i = 0; i < available_flights.length; i++) {
            if(available_flights[i].fn === flightnr) {
                return available_flights[i];
            }
        }
        return null;
    }

    let contract = new Contract('localhost', () => {
        let self = this;

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error ? error : "", "Operational Status: " + result);

            displayOperationalStatus([ { label: 'Operational Status', error: error, value: result} ]);
            displayFlightplan( available_flights, fetchFlightStatusCallback, registerFlightCallback);
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
            let updateFlight = resolveFlight(result.flight);
            if(updateFlight !== null) {
                updateFlight.status = result.status;
                let flight_row = DOM.elid("row_" + result.flight);
                displayUpdateFlightplanRow(flight_row, updateFlight, fetchFlightStatusCallback, registerFlightCallback);
            } else {
                console.log("Flight not found.");
            }

        });



    });

    function registerFlightCallback(flight){
        contract.registerFlight(flight, () => {
            console.log("DANONE");
        })
    }

    function fetchFlightStatusCallback(flight) {
        contract.fetchFlightStatus(flight, (error, result) => {
            if(error) {
                console.log(error);
            } else {
                console.log(result)
            }
        });
    }

})();


function displayFlightplan(flights, fetchFlightStatusCallback, registerFlightCallback) {
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";

    // Available Flights
    let sectionFlightPlan = DOM.section();
    sectionFlightPlan.appendChild(DOM.h2("Flightplan"));

    if(flights !== null){
        sectionFlightPlan.appendChild(DOM.h5("Currently available flights"));

        flights.map((flight) => {
            let row_id = 'row_' + flight.fn;

            let row = sectionFlightPlan.appendChild(DOM.div({id: row_id, className:'row'}));
            displayUpdateFlightplanRow(row, flight, fetchFlightStatusCallback, registerFlightCallback);

            sectionFlightPlan.appendChild(row);
        })

    } else {
        sectionFlightPlan.appendChild(DOM.h5("Loading available Flights..."));
    }

    displayDiv.append(sectionFlightPlan);


}

function displayUpdateFlightplanRow(row, flight, fetchFlightStatusCallback, registerFlightCallback) {

    function resolveStatusText(status_id) {
        switch (status_id) {
            case "0":
                return "Unknown";

            case "10":
                return "On Time";

            case "20":
                return "Late Airline";

            case "30":
                return "Later Weather";

            case "40":
                return "Late Technical";

            case "50":
                return "Late Other";
        }

        return "not Available";
    }

    row.innerHTML = "";

    row.appendChild(DOM.div({className: 'col-sm-1 field-value', style: { margin: 'auto 0 auto 0'}}, flight.time));
    row.appendChild(DOM.div({className: 'col-sm-1 field-value', style: { margin: 'auto 0 auto 0'}}, flight.fn));
    row.appendChild(DOM.div({className: 'col-sm-2 field-value', style: { margin: 'auto 0 auto 0'}}, flight.target));
    row.appendChild(DOM.div({className: 'col-sm-2 field', style: { margin: 'auto 0 auto 0'}}, resolveStatusText(flight.status)));

    let buttonFetchStatus = DOM.button({className: 'btn btn-primary', style: { margin: '5px'} }, "Fetch Status");
    buttonFetchStatus.addEventListener('click', () => {
        fetchFlightStatusCallback(flight.fn);
    });
    row.appendChild(buttonFetchStatus);

    let buttonInsuring = DOM.button({className: 'btn btn-warning', style: { margin: '5px'} }, "Register insuring");
    buttonInsuring.addEventListener('click', () => {
        registerFlightCallback(flight.fn);
    });
    row.appendChild(buttonInsuring);
}


function displayOperationalStatus(status) {
    let displayDiv = DOM.elid("display-wrapper-operational");
    displayDiv.innerHTML = "";

    let sectionOperationalStatus = DOM.section();
    sectionOperationalStatus.appendChild(DOM.h4('Operational Status'));
    sectionOperationalStatus.appendChild(DOM.h5('Check if contract is operational'));
    status.map((result) => {
        let row = sectionOperationalStatus.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        sectionOperationalStatus.appendChild(row);
    })
    displayDiv.append(sectionOperationalStatus);
};




