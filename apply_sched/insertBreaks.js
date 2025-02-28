/*Version Info
-----Version-1.2----
*/
const fs = require("fs");
const oracledb = require("oracledb");
const dbconfig = require('../dbconfig');
// Function to read a JSON file
function readJsonFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function parseBreakStepsGadabout(jsonData,travel_date) {
  const breakDetails = {
    id: [],
    vehid: [],
    pTravelDate:[],
    type: [],
    service: [],
    psystemuser: [],
    pDummy: [],
    ResultInfo: [],
  };
  for (let routeIndex = 0; routeIndex < jsonData.routes.length; routeIndex++) {
    const route = jsonData.routes[routeIndex];
    for (let stepIndex = 0; stepIndex < route.steps.length; stepIndex++) {
      const step = route.steps[stepIndex];
      if (step.type === "break") {
        // Assuming that the break step follows a delivery or pickup step
        const previousStepId = stepIndex > 0 ? route.steps[stepIndex - 1].id : undefined;
      console.log("previousStepId ",previousStepId );

        console.log("vehicle",route.vehicle);
       console.log("description",route.steps[stepIndex-1]);
       if (previousStepId && parseFloat(step.service) > 0) {

         console.log("other breaks");
         console.log("step",step);
        const tripId = 'T' + previousStepId.toString();
        breakDetails.vehid.push(route.vehicle);
        // Add details to arrays
        breakDetails.id.push(tripId);
        breakDetails.type.push("D");
        breakDetails.service.push(parseFloat(step.service) / 60);
        breakDetails.psystemuser.push("GSE2");
        breakDetails.pTravelDate.push('');
        breakDetails.pDummy.push(travel_date+"~"+(Math.ceil(((step.arrival)/60)+((step.waiting_time)/60))).toString());
        breakDetails.ResultInfo.push("");
        // Log route and step information
        //console.log(`Route Index: ${routeIndex}, Step Index: ${stepIndex}, Previous Step ID: ${previousStepId}`);
      }
      else if(step.type==='break' && stepIndex===1 && route.description.split(" ").length!=3){
        let segmentId='';
        let resnum=Math.floor(route.vehicle/100);
        if (resnum < 10) {
          segmentId = 'S00' + resnum.toString();
        }else {
          segmentId = 'S0' + resnum.toString();
        }
      // Add details to arrays
      breakDetails.id.push(segmentId);
      breakDetails.vehid.push(resnum);
      breakDetails.type.push("D");
      breakDetails.service.push(parseFloat(step.service) / 60);
      breakDetails.psystemuser.push("GSE2");
      breakDetails.pTravelDate.push(travel_date);
      breakDetails.pDummy.push(travel_date+"~"+(Math.ceil(((step.arrival)/60)+((step.waiting_time)/60))).toString());
      breakDetails.ResultInfo.push("");
      }else if (step.type==='break' && stepIndex===1 && route.description.split(" ").length===3) {

         console.log("other breaks");
         console.log("step",step);
        const tripId = 'T' + route.description.split(" ")[2];
        breakDetails.vehid.push(route.vehicle);
        // Add details to arrays
        breakDetails.id.push(tripId);
        breakDetails.type.push("D");
        breakDetails.service.push(parseFloat(step.service) / 60);
        breakDetails.psystemuser.push("GSE2");
        breakDetails.pTravelDate.push('');
        breakDetails.pDummy.push(travel_date+"~"+(Math.ceil(((step.arrival)/60)+((step.waiting_time)/60))).toString());
        breakDetails.ResultInfo.push("");
        // Log route and step information
        //console.log(`Route Index: ${routeIndex}, Step Index: ${stepIndex}, Previous Step ID: ${previousStepId}`);
      }

     }
    }
  }
  console.log("break details for step",breakDetails);
  return breakDetails;
}

// Move parseBreakSteps function outside
function parseBreakSteps(jsonData,travel_date) {
  const breakDetails = {
    id: [],
   vehid: [],
    pTravelDate:[],
        type: [],
    service: [],
    psystemuser: [],
    pDummy: [],
    ResultInfo: [],
  };

  for (let routeIndex = 0; routeIndex < jsonData.routes.length; routeIndex++) {
    const route = jsonData.routes[routeIndex];

    for (let stepIndex = 0; stepIndex < route.steps.length; stepIndex++) {
      const step = route.steps[stepIndex];

      if (step.type === "break") {
        // Assuming that the break step follows a delivery or pickup step
        const previousStepId = stepIndex > 0 ? route.steps[stepIndex - 1].id : undefined;

        // Skip cases where trip id is undefined or service time is zero
        if (route.steps[stepIndex-1].type==='break') {
            const tripId = 'T' + previousStepId.toString();
            // Add details to arrays
            breakDetails.id.push(tripId);
            breakDetails.type.push("D");
            breakDetails.service.push(parseFloat(step.service) / 60);
            breakDetails.psystemuser.push("GSE2");
            breakDetails.pDummy.push("B" +"~"+(((step.arrival)/60)+((step.waiting_time)/60)).toString());
            breakDetails.ResultInfo.push("");
  
            // Log route and step information
            //console.log(`Route Index: ${routeIndex}, Step Index: ${stepIndex}, Previous Step ID: ${previousStepId}`);
          }else if (previousStepId && parseFloat(step.service) > 0) {
          const tripId = 'T' + previousStepId.toString();
          // Add details to arrays
          breakDetails.id.push(tripId);
          breakDetails.type.push("D");
          breakDetails.service.push(parseFloat(step.service) / 60);
          breakDetails.psystemuser.push("GSE2");
          breakDetails.pDummy.push(travel_date+"~"+(((step.arrival)/60)+((step.waiting_time)/60)).toString());
          breakDetails.ResultInfo.push("");

          // Log route and step information
          //console.log(`Route Index: ${routeIndex}, Step Index: ${stepIndex}, Previous Step ID: ${previousStepId}`);
        }else if(step.type==='break' && stepIndex===1){
            let segmentId;
            if (route.vehicle > 1000) {
              segmentId = 'S' + route.vehicle.toString();
            } else if(route.vehicle > 100) {
              segmentId = 'S0' + route.vehicle.toString();
            }else{
              segmentId = 'S00' + route.vehicle.toString();
            }
          // Add details to arrays
          breakDetails.id.push(segmentId);
          breakDetails.type.push("D");
          breakDetails.service.push(parseFloat(step.service) / 60);
          breakDetails.psystemuser.push("GSE2");
          breakDetails.pDummy.push(travel_date +"~"+(((step.arrival)/60)+((step.waiting_time)/60)).toString());
          breakDetails.ResultInfo.push("");
        }
      }
    }
  }

  return breakDetails;
}

// Function to insert breaks into Oracle DB
async function callStoredProc(pRydeLogTripId, pStopType, pBreakTimeMin, pUserId, pDummy1, tenant,vehid,traveldate, oResultInfo) {
  let connection;
  try {
    connection=await oracledb.getConnection(dbconfig[tenant]);
    
      const bindVars2 = {
      pRydeLogTripId: { val: pRydeLogTripId },
      pStopType: { val: pStopType },
      pBreakTimeMin: { val: pBreakTimeMin },
      pUserId: { val: pUserId },
      pDummy1: { val: pDummy1 },
      pVehid : {val : vehid},
      pTravelDate:{val:traveldate},
      oResultInfo: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
    };

    const bindVars1 = {
      pRydeLogTripId: { val: pRydeLogTripId },
      pStopType: { val: pStopType },
      pBreakTimeMin: { val: pBreakTimeMin },
      pUserId: { val: pUserId },
      pDummy1: { val: pDummy1 },
      oResultInfo: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
    };
    
   

let result;

if (tenant === 'NOTA') {
    result = await connection.execute(
        "BEGIN ITMS8_GSE20.ON_FLY_ADD_BREAK_TRIPS_V1(:pRydeLogTripId, :pStopType, :pBreakTimeMin, :pUserId, :pDummy1, :pVehid, :pTravelDate, :oResultInfo); END;",
        bindVars2
    );
} else {
    result = await connection.execute(
        "BEGIN DEV.ITMS8_GSE20.ON_FLY_ADD_BREAK_TRIPS_V2(:pRydeLogTripId, :pStopType, :pBreakTimeMin, :pUserId, :pDummy1, :oResultInfo); END;",
        bindVars1
    );
}



    console.log("Stored procedure executed successfully. Result:", result.outBinds.oResultInfo);
   const [status, errorMessage] = result.outBinds.oResultInfo.split('~');
   if (status === 'NOK') {
  console.log(`Stored procedure result is NOK for Trip ID ${pRydeLogTripId}`);
  console.log(`Error Message: ${errorMessage}`);
  console.log("Result",result.outBinds.oResultInfo);
  
}
return result.outBinds.oResultInfo;
  } catch (err) {
    console.error("Error calling stored procedure:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing the connection:", err);
      }
    }
  }
}

// Main function to insert breaks
async function insertBreaks(travelDate, filename, tenant) {
  try {
    const filePath = `/var/www/html/GSE2/Schedules/${filename}`; // Replace with your break file path
    const jsonData = await readJsonFile(filePath);
    let breakDetails='';
    if(tenant==='NOTA'||tenant==='WOTA'||tenant==='OPC'){
      
      breakDetails = parseBreakStepsGadabout(jsonData,travelDate);
    }else{
    breakDetails = parseBreakSteps(jsonData,travelDate);
    }
    let tempTripId;

    // Update Oracle DB with breakDetails
    for (let i = 0; i < breakDetails.id.length; i++) {
      let resultInfo;
      let resultInfo1;
      let tripId = breakDetails.id[i];
      let status, message;
      let status1, message1;
      let index;
        resultInfo = await callStoredProc(tripId, breakDetails.type[i], breakDetails.service[i], breakDetails.psystemuser[i], breakDetails.pDummy[i], tenant,breakDetails.vehid[i],breakDetails.pTravelDate[i], breakDetails.ResultInfo[i]);
        console.log('ResultInfo', resultInfo);
        [status, message] = resultInfo.split('~');

        if (status === 'OK') {
          tempTripId = message;
          console.log("The temp tripid is", tempTripId);
          index=i;
        } else if (status === 'NOK') {
          console.log(message);
          tripId = tempTripId;
          console.log("Retrying with new Trip ID:", tripId);
        resultInfo1=await callStoredProc(tripId, breakDetails.type[i], breakDetails.service[i], breakDetails.psystemuser[i], breakDetails.pDummy[i], tenant);
        console.log('ResultInfo', resultInfo1);
        [status1, message1] = resultInfo1.split('~');
        tempTripId = message1;
        } else {
          console.log(message);
        }
          }
  } catch (err) {
    console.error("Error in insertBreaks:", err);
  }
}

module.exports = insertBreaks;
