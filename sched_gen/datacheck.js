const fs = require('fs');

function checkTimeWindow(vehicle) {
    const timeWindow = vehicle.time_window || [];
    return timeWindow.length === 2 && timeWindow[0] < timeWindow[1];
}

function checkShipmentTimeWindow(shipment) {
    const pickupTimeWindow = shipment.pickup.time_windows && shipment.pickup.time_windows[0];
    const deliveryTimeWindow = shipment.delivery && shipment.delivery.time_windows && shipment.delivery.time_windows[0];
        
    // Check if pickup time window doesn't exist or doesn't meet the format
    if (!pickupTimeWindow || pickupTimeWindow.length !== 2 || pickupTimeWindow[0] >= pickupTimeWindow[1]) {
        return false;
    }

    // Check if delivery time window doesn't exist or doesn't meet the format
    if (deliveryTimeWindow && (deliveryTimeWindow.length !== 2 || deliveryTimeWindow[0] >= deliveryTimeWindow[1])) {
        return false;
    }

    return true; // Both pickup and delivery time windows are valid
}

function removeInvalidItems(items, checkFunction) {
    return items.filter(checkFunction);
}

function datacheck(filePath) {
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const vehicles = jsonData.vehicles || [];
    const shipments = jsonData.shipments || [];

    const invalidVehicles = vehicles.filter(vehicle => !checkTimeWindow(vehicle));
    const invalidShipments = shipments.filter(shipment => !checkShipmentTimeWindow(shipment));

    // Log out the faulty vehicle and shipment IDs
    invalidVehicles.forEach(vehicle => console.log(`Invalid time window for vehicle ${vehicle.id}`));
    invalidShipments.forEach(shipment => console.log(`Invalid time window for shipment ${shipment.pickup.id}`));

    // Write the faulty IDs to a fault.txt file
    const faultData = [
        ...invalidVehicles.map(vehicle => `Invalid time window for vehicle ${vehicle.id}`),
        ...invalidShipments.map(shipment => `Invalid time window for shipment ${shipment.pickup.id}`)
    ];
    fs.writeFileSync('fault.txt', faultData.join('\n'));

    // Remove invalid items from the JSON data
    const validVehicles = vehicles.filter(vehicle => checkTimeWindow(vehicle));
    const validShipments = shipments.filter(shipment => checkShipmentTimeWindow(shipment));

    // Write back the filtered data to the file
    jsonData.vehicles = validVehicles;
    jsonData.shipments = validShipments;
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

    console.log("Filtered data written back to the file.");
}

module.exports =datacheck;

/*
const filePath = process.argv[2]; // Take file-name as input from command line argument
if (!filePath) {
    console.error("Please provide the file name as an argument.");
} else {
    datacheck(filePath);
}
*/
