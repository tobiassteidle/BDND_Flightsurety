pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedCaller;

    struct Airline {
        bool isRegistered;
        bool isFounded;
    }
    mapping(address => Airline) private airlines;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                )
                                public
    {
        contractOwner = msg.sender;

        // Create first Airline - but without funding
        airlines[firstAirline] =  Airline({isRegistered: true, isFounded: false});
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    modifier requireIsCallerAuthorized()
    {
        require(authorizedCaller[msg.sender] == 1 || msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAirlineRegistered(address originSender)
    {
        require(isCallerAirlineRegistered(originSender), "Caller not registered");
        _;
    }

    modifier requireIsCallerAirlineFounded(address originSender)
    {
        require(isCallerAirlineFounded(originSender), "Caller can not participate in contract until it submits funding");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeCaller(address contractAddress) external requireContractOwner
    {
        authorizedCaller[contractAddress] = 1;
    }

    function deauthorizeCaller(address contractAddress) external requireContractOwner
    {
        delete authorizedCaller[contractAddress];
    }

    function isAuthorizedCaller(address contractAddress)
                            public
                            view
                            requireContractOwner
                            returns(bool)
    {
        return authorizedCaller[contractAddress] == 1;
    }

    function isCallerAirlineRegistered(address originSender)
                            public
                            view
                            returns (bool)
    {
        return airlines[originSender].isRegistered;
    }

    function isCallerAirlineFounded(address originSender)
                            public
                            view
                            returns (bool)
    {
        return airlines[originSender].isFounded;
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function getBalance
                            (
                            )
                            public
                            view
                            requireIsOperational
                            requireContractOwner
                            returns (uint256)
    {
        return address(this).balance;
    }

    function isAirline
                            (
                                address airline
                            )
                            external
                            view
                            requireIsOperational
                            returns (bool)

    {
        return airlines[airline].isRegistered;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
                            (
                                address originSender,
                                address airline
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
                            requireIsCallerAirlineRegistered(originSender)
                            requireIsCallerAirlineFounded(originSender)
                            returns(bool success)
    {
        require(!airlines[airline].isRegistered, "Airline already registred");
        airlines[airline] =  Airline({isRegistered: true, isFounded: false});
        return airlines[airline].isRegistered;
    }

    function fundAirline
                            (
                                address airline
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
    {
        airlines[airline].isFounded = true;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */
    function buy
                            (
                            )
                            external
                            payable
                            requireIsOperational
                            requireIsCallerAuthorized
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                requireIsOperational
                                requireIsCallerAuthorized
    {
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
                            (
                            )
                            public
                            payable
                            requireIsOperational
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}

