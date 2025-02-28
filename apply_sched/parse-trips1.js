/*Version Info
-----Version-1.1----
*/
const fs = require("fs");
const oracledb = require("oracledb");
const dbconfig = require('../dbconfig');
var pickupAttributes = {},
  deliveryAttributes = {};
var pickuparr = {},delarr={};

async function updateDB(tenant) {
  let connection;
  try {
    connection=await oracledb.getConnection(dbconfig[tenant]);
    console.log(dbconfig[tenant]);
    console.log(connection);

    var puSQLQry = `
      DECLARE
        pCount INTEGER := :pCount;
        pStopType VARCHAR2(50) := :pStopType;
      BEGIN
        ITMS8_GSE20.UpdateTripsTable( pCount, pStopType, 
          ITMS8_GSE20.DATE_ARRAY(`+pickuparr.TravelDate+`), 
          ITMS8_GSE20.VAR_ARRAY(`+pickuparr.id+`), 
          ITMS8_GSE20.VAR_ARRAY(`+pickuparr.SuggResNum+`), 
          ITMS8_GSE20.VAR_ARRAY(`+pickuparr.ResNum+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.pIndex+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.stopNumber+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.perftime+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.eta+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.etd+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.pAmbOcc+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.pWcOcc+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.PDistToNextStop+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.PTimeToNextStop+`), 
          ITMS8_GSE20.VAR_ARRAY(`+pickuparr.psystemuser+`), 
          ITMS8_GSE20.VAR_ARRAY(`+pickuparr.POperId+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.pDriverWait+`), 
          ITMS8_GSE20.NUM_ARRAY(`+pickuparr.pPassengerWait+`)
        );
      END;  
    `;
    var doSQLQry = `
      DECLARE
        pCount INTEGER := :pCount;
        pStopType VARCHAR2(50) := :pStopType;
      BEGIN
        ITMS8_GSE20.UpdateTripsTable( pCount, pStopType, 
          ITMS8_GSE20.DATE_ARRAY(`+delarr.TravelDate+`), 
          ITMS8_GSE20.VAR_ARRAY(`+delarr.id+`), 
          ITMS8_GSE20.VAR_ARRAY(`+delarr.SuggResNum+`), 
          ITMS8_GSE20.VAR_ARRAY(`+delarr.ResNum+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.pIndex+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.stopNumber+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.perftime+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.eta+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.etd+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.pAmbOcc+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.pWcOcc+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.PDistToNextStop+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.PTimeToNextStop+`), 
          ITMS8_GSE20.VAR_ARRAY(`+delarr.psystemuser+`), 
          ITMS8_GSE20.VAR_ARRAY(`+delarr.POperId+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.pDriverWait+`), 
          ITMS8_GSE20.NUM_ARRAY(`+delarr.pPassengerWait+`)
        );
      END;
    `;
    var puDataParams_Temp = {
        pCount: pickupAttributes.id.length,
        pStopType: 'P'
      };
    var doDataParams_Temp = {
      pCount: deliveryAttributes.id.length,
      pStopType: 'D'
    };  
    console.log("puSQLQry: " + puSQLQry);
    await connection.execute(puSQLQry, puDataParams_Temp);
    await connection.commit();
    console.log("doSQLQry: " + doSQLQry);
    await connection.execute(doSQLQry, doDataParams_Temp);
    await connection.commit();
    console.log("Stored procedure executed successfully.");
  } catch (err) {
    console.error("Error calling stored procedure:", err);
  } finally {
    // Release the connection
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing the connection:", err);
      }
    }
  }
}

// Read the JSON file
function readJsonFile(travelDate,filename,tenant,fileno) {
  console.log("readJsonFile() starts");
  fs.readFile(`/var/www/html/GSE2/Schedules/${filename}`, "utf8", async (err, data) => {
    console.log("read json file starts");
    if (err) {
      console.error("Error reading the JSON file:", err);
      return;
    }

    try {
      const jsonData = JSON.parse(data);

      // Initialize arrays to store pickup and delivery data
      const pickupData = [];
      const deliveryData = [];
      const jobData = [];
      // Iterate through the "routes"
      for (
        let routeIndex = 0;
        routeIndex < jsonData.routes.length;
        routeIndex++
      ) {
        const route = jsonData.routes[routeIndex];
        const tripDetails = route.steps;

        // Initialize variables for stop number, previous step's distance, and previous step's duration
        let stopNumber = 5;
        let prevStepDistance = 0;
        let prevStepDuration = 0;
        let prevStepLoad = [0, 0];
        let pAmb = 0;
        let pWc = 0;

        // Iterate through trip details to find pickup and delivery information
        for (let stepIndex = 0; stepIndex < tripDetails.length; stepIndex++) {
          const step = tripDetails[stepIndex];
          const loadChange = step.load.map((value, index) => value - prevStepLoad[index]);
          // Calculate the travel date seconds
          const travelDateSeconds = Date.parse(travelDate.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')) / 1000-14400;
          // Subtracting the offset for GMT0000
          let arrivalSeconds;
          //console.log("Travel Date:",travelDate); 
          //console.log("Seconds from 01-Jan-1970  till travel date:",travelDateSeconds);
          //console.log("Seconds from 01-Jan-1970  till travel date:",travelDateSecondsoff);
          if(tenant === 'CCT' && route.description==='CCT'){
            vehicleCode = 'S' + (route.vehicle < 10 ? '0' : '') + route.vehicle.toString();
          }else if(route.description==='DART'){
            vehicleCode = 'S' + (route.vehicle < 1000 ? '0' : '00') + route.vehicle.toString();
          }else if(tenant === 'WASHCOSRT'||tenant==='RTAIA'||route.description==='SMART'){
            vehicleCode = 'S' + route.vehicle.toString();
          }else {
            vehicleCode = 'S' + (route.vehicle < 10 ? '00' : '0') + route.vehicle.toString();          
          }
          if (step.type === "pickup") {
          // Calculate the load change from the previous step
           // Increment or decrement pAmb based on loadChange[0]
           arrivalSeconds =parseFloat(step.arrival);
          //console.log(step.arrival);
          //console.log(arrivalSeconds);
          pAmb += loadChange[0];
          // Increment or decrement pWc based on loadChange[1]
          pWc += loadChange[1];
            pickupData.push({
              stopNumber,
              id: 'T' + String(step.job),
              address: step.description,
              eta: Math.ceil((parseFloat(arrivalSeconds)) / 60), // Convert to minutes +parseFloat(step.waiting_time)
              type: "P",
              perftime: Math.ceil(
                (parseFloat(step.service)) / 60
              ), // Convert to minutes
              etd: Math.ceil(
                (parseFloat(step.waiting_time)+parseFloat(arrivalSeconds) + parseFloat(step.service)) / 60
              ), // Convert to minutes
              pDriverWait: Math.ceil(step.waiting_time / 60), // Convert to minutes
              PDistToNextStop: 
                stepIndex === 0 // Check for the first step
                ? 0 
                : Math.ceil(
                    (parseFloat(step.distance) - parseFloat(tripDetails[stepIndex - 1].distance)) / 1609.34
                  ), // Convert to miles
            PTimeToNextStop:
                stepIndex === 0 // Check for the first step
                ? 0
                : Math.ceil(
                    (parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60
                  ), // Convert to minutes
              psystemuser: "GSE-"+fileno.toString(),
              POperId: route.description,
              TravelDate:travelDate,
              ResNum: vehicleCode,
              SuggResNum: vehicleCode,            
              pAmbOcc: pAmb,
              pWcOcc: pWc,
              pPassengerWait: 0,
              pIndex: 0,
              // Include other parameters as needed
            });

            // Update previous step's distance and duration for the next iteration
            prevStepDistance = parseFloat(step.distance);
            prevStepDuration = parseFloat(step.duration);
            prevStepLoad = step.load;
            stopNumber += 5;
          } else if (step.type === "delivery") {
            arrivalSeconds =parseFloat(step.arrival);
            //console.log(step.arrival);
            //console.log(arrivalSeconds);
          
            pAmb += loadChange[0];
            pWc += loadChange[1];
            deliveryData.push({
              stopNumber,
              id: 'T' + String(step.job),
              address: step.description,
              eta: Math.ceil((parseFloat(arrivalSeconds)) / 60), // Convert to minutes +parseFloat(step.waiting_time)
              type: "D",
              perftime: Math.ceil(
                (parseFloat(step.service)) / 60
              ), // Convert to minutes
              etd: Math.ceil(
                (parseFloat(step.waiting_time)+parseFloat(arrivalSeconds) + parseFloat(step.service)) / 60
              ), // Convert to minutes
              dDriverWait: Math.ceil(step.waiting_time / 60), // Convert to minutes
              DDistToNextStop: 
                stepIndex === 0 // Check for the first step
                ? 0 
                : Math.ceil(
                    (parseFloat(step.distance) - parseFloat(tripDetails[stepIndex - 1].distance)) / 1609.34
                  ), // Convert to miles
            DTimeToNextStop:
                stepIndex === 0 // Check for the first step
                ? 0
                : Math.ceil(
                    (parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60
                  ), // Convert to minutes
              dsystemuser: "GSE-"+fileno.toString(),
              DOperId: route.description,
              TravelDate: travelDate,
              ResNum:vehicleCode,
              SuggResNum: vehicleCode,            
              dAmbOcc: pAmb,
              dWcOcc: pWc,
              dPassengerWait: 0,
              dIndex: 0,
              // Include other parameters as needed
            });

            prevStepDistance = parseFloat(step.distance);
            prevStepDuration = parseFloat(step.duration);
            prevStepLoad = step.load;
            stopNumber += 5;
          }else if (step.type === "job") {
            arrivalSeconds =parseFloat(step.arrival + step.waiting_time);
            jobData.push({
              stopNumber,
              id: 'T' + String(step.job),
              address: step.description,
              eta: Math.ceil(parseFloat(arrivalSeconds) / 60),
              type: "J",
              perftime: 0,
              etd: Math.ceil(parseFloat(arrivalSeconds) / 60),
              pDriverWait: 0,
              PDistToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.distance) - parseFloat(tripDetails[stepIndex - 1].distance)) / 1609.34),
              PTimeToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60),
              psystemuser: "GSE-"+fileno.toString(),
              POperId: route.description,
              TravelDate: travelDate,
              ResNum: (tenant === 'GADABOUT' || tenant === 'AOPP' ? 'S' + (route.vehicle < 10 ? '00' : '0') : 'S') + route.vehicle.toString(),
              SuggResNum: (tenant === 'GADABOUT' || tenant === 'AOPP' ? 'S' + (route.vehicle < 10 ? '00' : '0') : 'S') + route.vehicle.toString(),
              pAmbOcc: pAmb,
              pWcOcc: pWc,
              pPassengerWait: 0,
              pIndex: 0,
            });// Update pickup and delivery data at the same index
            
              pickupData.push({
                ...jobData[jobData.length - 1],
                type: "P",
                POperId:"GADABOUT",
              }); 
              stopNumber += 5;
              deliveryData.push({
                ...jobData[jobData.length - 1],
                type: "D",
		eta: Math.ceil((parseFloat(arrivalSeconds)+ parseFloat(step.service)) / 60),
                etd: Math.ceil((parseFloat(arrivalSeconds)+ parseFloat(step.service)) / 60),
                DOperId:"GADABOUT",
                stopNumber
              });
            
            stopNumber += 5;
          }
        }
      }

      // Separate arrays for all attributes of pickup and delivery
      pickupAttributes = {
        stopNumber: pickupData.map((item) => item.stopNumber),
        id: pickupData.map((item) => item.id),
        address: pickupData.map((item) => item.address),
        eta: pickupData.map((item) => item.eta),
        type: pickupData.map((item) => item.type),
        perftime: pickupData.map((item) => item.perftime),
        etd: pickupData.map((item) => item.etd),
        pDriverWait: pickupData.map((item) => item.pDriverWait),
        PDistToNextStop: pickupData.map((item) => item.PDistToNextStop),
        PTimeToNextStop: pickupData.map((item) => item.PTimeToNextStop),
        psystemuser: pickupData.map((item) => item.psystemuser),
        POperId: pickupData.map((item) => item.POperId),
        TravelDate: pickupData.map((item) => item.TravelDate),
        ResNum: pickupData.map((item) => item.ResNum),
        SuggResNum: pickupData.map((item) => item.SuggResNum),
        pAmbOcc: pickupData.map((item) => item.pAmbOcc),
        pWcOcc: pickupData.map((item) => item.pWcOcc),
        pPassengerWait: pickupData.map((item) => item.pPassengerWait),
        pIndex: pickupData.map((item) => item.pIndex),
      };
      
    Object.keys(pickupAttributes).forEach(key => {
        pickuparr[key] = JSON.stringify(pickupAttributes[key]).replace(/"/g, "'").slice(1,-1);
    });

      deliveryAttributes = {
        stopNumber: deliveryData.map((item) => item.stopNumber),
        id: deliveryData.map((item) => item.id),
        address: deliveryData.map((item) => item.address),
        eta: deliveryData.map((item) => item.eta),
        type: deliveryData.map((item) => item.type),
        perftime: deliveryData.map((item) => item.perftime),
        etd: deliveryData.map((item) => item.etd),
        pDriverWait: deliveryData.map((item) => item.dDriverWait),
        PDistToNextStop: deliveryData.map((item) => item.DDistToNextStop),
        PTimeToNextStop: deliveryData.map((item) => item.DTimeToNextStop),
        psystemuser: deliveryData.map((item) => item.dsystemuser),
        POperId: deliveryData.map((item) => item.DOperId),
        TravelDate: deliveryData.map((item) => item.TravelDate),
        ResNum: deliveryData.map((item) => item.ResNum),
        SuggResNum: deliveryData.map((item) => item.SuggResNum),
        pAmbOcc: deliveryData.map((item) => item.dAmbOcc),
        pWcOcc: deliveryData.map((item) => item.dWcOcc),
        pPassengerWait: deliveryData.map((item) => item.dPassengerWait),
        pIndex: deliveryData.map((item) => item.pIndex),
      };
    Object.keys(deliveryAttributes).forEach(key => {
        delarr[key] = JSON.stringify(deliveryAttributes[key]).replace(/"/g, "'").slice(1,-1);
    });
const pickupAttributesString = JSON.stringify(pickupAttributes, null, 2);
const deliveryAttributesString = JSON.stringify(deliveryAttributes, null, 2);

try {
  fs.writeFileSync('pickupAttributes.txt', pickupAttributesString);
  fs.writeFileSync('deliveryAttributes.txt', deliveryAttributesString);
  console.log('Files written successfully.');
} catch (err) {
  console.error('Error writing files:', err);
}
console.log('Files written successfully.');
      await updateDB(tenant);
    } catch (err) {
      console.error("Error parsing JSON:", err);
    }
    console.log("read json file ends");
    return;
  });
  console.log("readJsonFile() ends");
}

async function updatetrips() {
  console.log("main() starts");
 // await get_pooling();
  readJsonFile();
  console.log("main() ends");
}
module.exports=updatetrips;
module.exports=readJsonFile;
//main();

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};
