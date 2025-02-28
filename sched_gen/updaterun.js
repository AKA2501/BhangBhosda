/*Version Info
-----Version-1.2----
*/
const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
const dbconfig = require('../dbconfig');
async function updateSchedulingRunInfo(travelDate, jdata, filename, vehicles, trips, tenant) {
  let connection;
  try {
     connection=await oracledb.getConnection(dbconfig[tenant]);
    // Enhanced operId Logic
    let operId;
   /* if (jdata.length === 1) {
      operId = jdata.operator || 'ALL';
    } else if (jdata.length === 2) {
      operId = [jdata.operator, jdata.operator].filter(Boolean).join(',');
    } else {
      operId = 'ALL';
    }*/

   operId = jdata.operator;
 //operId = jdata.operator.replace('SPARTAN', '').replace(/[()]/g, '').trim();

    // JSON File Processing with Rounding
    const jsonData = parseJsonFile(filename);
    if (!jsonData) {
      console.error('Error parsing JSON file');
      return;
    }

    // Date formatting 
    console.log("jsonData for update schduling",jsonData);
    let formattedDate = formatDate(travelDate);

    // Rounded Calculations (Ensure values are converted to numbers)
    const tpsh = parseFloat(jsonData.tpsh);
    const rpsh = parseFloat(jsonData.rpsh);
    const tprh = parseFloat(jsonData.tprh);
    const rprh = parseFloat(jsonData.rprh);

    const unassignedtrips = jsonData.unassignedCount / 2;
    const serialNumber = parseFilenameForSerialNumber(filename);
    let usedsegments=0;

    if(operId==='RTA8' || operId==='NOTA'||operId==='OPC'||operId==='WOTA'){
      const data = fs.readFileSync(filename, 'utf8');
      const json_data = JSON.parse(data);
       
      //console.log("inside operator:",operator); 
        const idsDividedBy100 = json_data.routes.map(route => Math.floor(route.vehicle / 100)); // Use a Set to count distinct values
        const distinctIds = new Set(idsDividedBy100); 
        console.log("Distinct Count:", distinctIds.size); 
        usedsegments= distinctIds.size;
      }else{
     usedsegments=jsonData.routes;
   }

      console.log("vehicles",vehicles);

    // Parameter Formatting
    const formattedParameters = `
      userId: ${jdata.userid}
      travelDate: ${formattedDate}
      operId: ${operId}
      runNum: ${serialNumber}
      totalSegments: ${vehicles}
      emptySeg: ${vehicles - usedsegments}
      scheduledTrips: ${trips - unassignedtrips}
      leftUnassigned: ${unassignedtrips}
      leastTripsOnSeg: ${jsonData.maxSteps} // Assuming maxSteps is correct
      mostTripsOnSeg: ${jsonData.minSteps} // Assuming minSteps is correct
      TPSH: ${tpsh}
      RPSH: ${rpsh}
      TPRH: ${tprh}
      RPRH: ${rprh}
    `;

    console.log('Formatted Parameters:');
    console.log(formattedParameters);

    // Stored Procedure Call with Error Handling
    const sql = `BEGIN ITMS8_GSE20.UPDATE_SCHEDULING_RUN_INFO(:userId, :travelDate, :operId, :runNum, :totalSegments, :emptySeg, :scheduledTrips, :leftUnassigned, :leastTripsOnSeg, :mostTripsOnSeg, :TPSH, :RPSH, :TPRH, :RPRH, :aOutVariable); END;`;

    const bindVars = {
      userId: { dir: oracledb.BIND_IN, val: jdata.userid },
      travelDate: { dir: oracledb.BIND_IN, val: formattedDate },
      operId: { dir: oracledb.BIND_IN, val: operId },
      runNum: { dir: oracledb.BIND_IN, val: serialNumber },
      totalSegments: { dir: oracledb.BIND_IN, val: vehicles },
      emptySeg: { dir: oracledb.BIND_IN, val: vehicles - usedsegments },
      scheduledTrips: { dir: oracledb.BIND_IN, val: trips - unassignedtrips },
      leftUnassigned: { dir: oracledb.BIND_IN, val: unassignedtrips },
      leastTripsOnSeg: { dir: oracledb.BIND_IN, val: jsonData.maxSteps },
      mostTripsOnSeg: { dir: oracledb.BIND_IN, val: jsonData.minSteps },
      TPSH: { dir: oracledb.BIND_IN, val: tpsh },
      RPSH: { dir: oracledb.BIND_IN, val: rpsh },
      TPRH: { dir: oracledb.BIND_IN, val: tprh },
      RPRH: { dir: oracledb.BIND_IN, val: rprh },
      aOutVariable: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
    };

    const result = await connection.execute(sql, bindVars, { autoCommit: true });
    console.log("Procedure executed.");
    console.log("Output value (aOutVariable):", result.outBinds.aOutVariable);

    await connection.close();
  } catch (err) {
    console.error("Error executing procedure:", err);
  }
}

function parseJsonFile(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    const jsonData = JSON.parse(data);

    const routes = jsonData.routes.length;
    const unassignedCount = jsonData.unassigned.length;

    let mostStepsRouteId = null;
    let leastStepsRouteId = null;
    let maxSteps = -1;
    let minSteps = Number.MAX_SAFE_INTEGER;
    jsonData.routes.forEach(route => {
      const steps = route.steps.filter(step => step.type === 'pickup' || step.type === 'delivery').length;
      if (steps > maxSteps) {
        maxSteps = steps;
        mostStepsRouteId = route.vehicle;
      }
      if (steps < minSteps) {
        minSteps = steps;
        leastStepsRouteId = route.vehicle;
      }
    });

    // Calculate service hours
    const serviceSeconds = jsonData.summary.service + jsonData.summary.duration + jsonData.summary.waiting_time;
    const serviceHours = serviceSeconds / 3600;

    // Calculate trips
    const trips = Number(jsonData.summary.amount[1])+Number(jsonData.summary.amount[0]);

    // Calculate TPSH
    const TPSH = trips / serviceHours;
/*
    // Calculate addPassenger
    let addPassenger = 0;
    jsonData.routes.forEach(route => {
      route.steps.forEach(step => {
        if (step.type === 'pickup' || step.type === 'delivery') {
          addPassenger += parseInt(step.description) || 0;
        }
      });
    });
    addPassenger /= 2;
*/
    let addPassenger = 0;
    // Calculate rides
    const rides = trips + addPassenger;

    // Calculate RPSH
    const RPSH = rides / serviceHours;

    // Calculate extratimeSeconds and newduration
    let extratimeSeconds = 0;
    jsonData.routes.forEach(route => {
      const steps = route.steps;
      if(steps.length===3){
       return;      
      }
      const firstPickup = steps.find(step => step.type === 'pickup');
      const lastDelivery = steps.reverse().find(step => step.type === 'delivery');
      const endStep = steps.find(step => step.type === 'end');
      extratimeSeconds += (endStep.duration - lastDelivery.duration) + firstPickup.duration;
    });
    const newduration = jsonData.summary.duration - extratimeSeconds;

    // Calculate Revenue hours
    const revenueSeconds = newduration + jsonData.summary.service + jsonData.summary.waiting_time;
    const revenueHours = revenueSeconds / 3600;

    // Calculate TPRH and RPRH
    const TPRH = trips / revenueHours;
    const RPRH = rides / revenueHours;

    // Return rounded parameters
    return {
      routes,
      unassignedCount,
      maxSteps: (maxSteps / 2),
      minSteps: (minSteps / 2),
      tpsh: TPSH.toFixed(2),
      rpsh: RPSH.toFixed(2),
      tprh: TPRH.toFixed(2),
      rprh: RPRH.toFixed(2)
    };
  } catch (err) {
    console.error('Error reading or parsing the JSON file:', err);
    return null;
  }
}

function parseFilenameForSerialNumber(filename) {
  const parts = path.basename(filename).split('_');
  const serialNumberWithExtension = parts[4].split('.')[0];
  return parseInt(serialNumberWithExtension, 10);
}
function formatDate(originalDate) {
  const dateParts = originalDate.split('-'); // Split using '-'
  if (dateParts.length !== 3) {
    // Handle invalid input
    console.error("Invalid date format:", originalDate); 
    return null; 
  }

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthNumber = (monthNames.indexOf(dateParts[1].toUpperCase()) + 1).toString().padStart(2, '0'); 
  const formattedDate = `${monthNumber}/${dateParts[0]}/${dateParts[2]}`; 
  return formattedDate;
}

module.exports = updateSchedulingRunInfo;

