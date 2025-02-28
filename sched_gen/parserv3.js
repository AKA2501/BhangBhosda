const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const dbconfig = require('../dbconfig');
//const secondFileName = '/var/www/html/GSE2/sched_gen/input-auto.json';

async function updateVehicleConfig(operIdScenario, travelDate, tenant,secondFileName ) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbconfig[tenant]);


    const sqlQuery3 = `
    SELECT TRIPID, RES_NUM, PU_STOP, DO_STOP
    FROM ITMS_TRIPS
    WHERE travel_date = '` + travelDate + `' 
        AND DISPOSITION = 'T'
        AND trip_type <> 'BRK'
        AND RES_NUM IS NOT NULL
        AND OPER_ID='${operIdScenario}' 
        AND NVL(route_type, '*' ) <> NVL('L', '*')
    ORDER BY RES_NUM, PU_STOP`;


        console.log(sqlQuery3);
        const result = await connection.execute(sqlQuery3); 
        // const vehicleSteps = convertToStepsArray(result);
	// console.log(vehicleSteps);
	console.log(result);
        // Check for empty results
        if (result.rows.length === 0) {
            console.log('No data found in the DB');
            return; 
        }
            // Original logic when theJData has less than 3 objects
            const secondData = fs.readFileSync(secondFileName, 'utf8');
            const secondJsonData = JSON.parse(secondData);
            const vehicleSteps = convertToStepsArray(result,secondJsonData.vehicles,secondJsonData.shipments);
            console.log(vehicleSteps);

            // Update vehicles in the second JSON data with steps
            secondJsonData.vehicles.forEach(vehicle => {
                const vehicleId = vehicle.id;
                if (vehicleSteps[vehicleId]) {
			console.log(vehicleId);
                    if (!vehicle.steps) {
                        vehicle.steps = [];  
                    }
                    vehicle.steps = vehicleSteps[vehicleId]; 
                }
            });

            // Write the updated JSON data to the output file
            fs.writeFileSync(secondFileName, JSON.stringify(secondJsonData, null, 2), 'utf8');
            console.log('Updated JSON data saved to', secondFileName);
        

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

// Convert query results to steps array
function convertToStepsArray(result,vehicles,shipments) {
    let stepsByVehicle = {};
    result.rows.forEach(row => {
        if (!row || !row[result.metaData.findIndex((m) => m.name === "TRIPID")] || !row[result.metaData.findIndex((m) => m.name === "RES_NUM")]) {
            return; // Skip this row if any required field is missing
        }

        let tripId = Number(row[result.metaData.findIndex((m) => m.name === "TRIPID")].replace('T', ''));

        let matchingShipment = shipments.find(shipment => shipment.pickup.id === tripId);
        let matchingVehicle = vehicles.find(vehicle => vehicle.id === matchingShipment.skills[0] );
        if(!matchingVehicle){
console.log(tripId);
}
        console.log(matchingVehicle);
        //let tripId = Number(row[result.metaData.findIndex((m) => m.name === "TRIPID")].replace('T', ''));
        // let vehicleId = Number(row[result.metaData.findIndex((m) => m.name === "RES_NUM")].replace('S', '')); 
        let vehicleId = matchingVehicle.id;
	//console.log(tripId);
	//console.log(vehicleId);
        if (!stepsByVehicle[vehicleId]) {
            stepsByVehicle[vehicleId] = [];
        }
        let pickupPosition = Math.ceil(row[result.metaData.findIndex((m) => m.name === "PU_STOP")] / 5) - 1;
        let deliveryPosition = Math.ceil(row[result.metaData.findIndex((m) => m.name === "DO_STOP")] / 5) - 1;
        stepsByVehicle[vehicleId][pickupPosition] = { type: 'pickup', id: Number(tripId) };
        stepsByVehicle[vehicleId][deliveryPosition] = { type: 'delivery', id: Number(tripId) };
    });
    Object.keys(stepsByVehicle).forEach(vehicleId => {
        stepsByVehicle[vehicleId] = stepsByVehicle[vehicleId].filter(step => step !== null);
    });
    return stepsByVehicle;
}

module.exports = updateVehicleConfig;

