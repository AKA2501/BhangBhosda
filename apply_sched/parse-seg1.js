const fs = require("fs");
const oracledb = require("oracledb");
const dbconfig = require('../dbconfig');

const SegmentStart = {
    travelDate: [],
    ids: [],
    pIndices: [],
    pEtas: [],
    pEtds: [],
    pDistToNextStops: [],
    pTimesToNextStops: [],
  };
  
  const SegmentEnd = {
    travelDate: [],
    ids: [],
    pIndices: [],
    pEtas: [],
    pEtds: [],
    pDistToNextStops: [],
    pTimesToNextStops: [],
  };

async function updateDB(tenant) {
    let connection;
    try {
      connection=await oracledb.getConnection(dbconfig[tenant]);
      var puSQLQry = `
        DECLARE
          pCount INTEGER := :pCount;
          pStopType VARCHAR2(10) := :pStopType;
        BEGIN
          ITMS8_OSRM.UpdateSegmentsTable( pCount,
            ITMS8_OSRM.DATE_ARRAY(`+JSON.stringify(SegmentStart.travelDate).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.VAR_ARRAY(`+JSON.stringify(SegmentStart.ids).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            pStopType, 
            ITMS8_OSRM.VAR_ARRAY(`+JSON.stringify(SegmentStart.pIndices).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentStart.pEtas).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentStart.pEtds).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentStart.pTimesToNextStops).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentStart.pDistToNextStops).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`)
          );
        END;
      `;
      var doSQLQry = `
        DECLARE
          pCount INTEGER := :pCount;
          pStopType VARCHAR2(50) := :pStopType;
        BEGIN
          ITMS8_OSRM.UpdateSegmentsTable( pCount, 
            ITMS8_OSRM.DATE_ARRAY(`+JSON.stringify(SegmentEnd.travelDate).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.VAR_ARRAY(`+JSON.stringify(SegmentEnd.ids).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            pStopType, 
            ITMS8_OSRM.VAR_ARRAY(`+JSON.stringify(SegmentEnd.pIndices).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentEnd.pEtas).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentEnd.pEtds).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentEnd.pTimesToNextStops).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`),
            ITMS8_OSRM.NUM_ARRAY(`+JSON.stringify(SegmentEnd.pDistToNextStops).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`)
           
          );
        END;
      `;
      var puDataParams_Temp = {
        pCount: SegmentStart.ids.length,
        pStopType: 'P'
      };
    var doDataParams_Temp = {
      pCount: SegmentEnd.ids.length,
      pStopType: 'D'
    };  
    //console.log("puSQLQry: " + puSQLQry);
    await connection.execute(puSQLQry, puDataParams_Temp);
    await connection.commit();
    //console.log("doSQLQry: " + doSQLQry);
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

function readJsonFile(travelDate,filename,tenant) {
    console.log("readJsonFile() starts");
    fs.readFile(`/var/www/html/GSE2/Schedules/${filename}`, "utf8", async (err, data) => {
      console.log("read json file starts");
      if (err) {
        console.error("Error reading the JSON file:", err);
        return;
      }
  
      try {
        const jsonData = JSON.parse(data);
        for (let routeIndex = 0; routeIndex < jsonData.routes.length; routeIndex++) {
            const route = jsonData.routes[routeIndex];
            const tripDetails = route.steps;
          
            const startStep = tripDetails.find(step => step.type === "start");
            const firstPickupStep = tripDetails.find(step => step.type === "pickup" && parseFloat(step.arrival) > parseFloat(startStep.arrival));
            const endStep = tripDetails.find(step => step.type === "end");
            const travelDateSeconds = Date.parse(travelDate.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')) / 1000-14400;
            let arrivalSeconds;
            if (startStep && firstPickupStep) {
              arrivalSeconds =startStep.arrival;
              const distanceInMetres = parseFloat(firstPickupStep.distance);
              const pDistToNextStop = Math.ceil(distanceInMetres / 1609.34);
              const arrivalFirstPickup = parseFloat(firstPickupStep.arrival);
              const serviceFirstPickup = parseFloat(firstPickupStep.service);
              const segmentIdPrefix = tenant === "UCT" ? "S0" : "S";
              const segmentId = segmentIdPrefix + (tenant==='MACON' ? '' : (route.vehicle < 10 ? '00' : '0')) + route.vehicle.toString();
              SegmentStart.travelDate.push(travelDate);
              SegmentStart.ids.push(segmentId);
              SegmentStart.pIndices.push('0');
              SegmentStart.pEtas.push(Math.ceil(arrivalSeconds / 60));
              SegmentStart.pEtds.push(Math.ceil(arrivalSeconds / 60));
              SegmentStart.pDistToNextStops.push(pDistToNextStop);
              SegmentStart.pTimesToNextStops.push(Math.ceil((arrivalFirstPickup + serviceFirstPickup - parseFloat(startStep.arrival)) / 60));
            }
          
            if (endStep) {
              arrivalSeconds =endStep.arrival;
	      const segmentIdPrefix = tenant === "UCT" ? "S0" : "S";
              const segmentId = segmentIdPrefix + (route.vehicle < 10 ? '00' : '0') + route.vehicle.toString();
              SegmentEnd.travelDate.push(travelDate);
              SegmentEnd.ids.push(segmentId);
              SegmentEnd.pIndices.push('0');
              SegmentEnd.pEtas.push(Math.ceil(arrivalSeconds / 60));
              SegmentEnd.pEtds.push(Math.ceil(arrivalSeconds / 60));
              SegmentEnd.pDistToNextStops.push(0);
              SegmentEnd.pTimesToNextStops.push(0);
            }
          }
          //console.log('SegmentStart:', SegmentStart);
          //console.log('SegmentEnd:', SegmentEnd);
         // console.log(SegmentStart.ids.length);
          //console.log(puDataParams_Temp.pStopType);
          //console.log(doDataParams_Temp.pStopType);
          

        await updateDB(tenant);
      } catch (err) {
        console.error("Error parsing JSON:", err);
      }
      console.log("read json file ends");
      return;
    });
    console.log("readJsonFile() ends");
  }




async function updateseg() {
    console.log("main() starts");

    readJsonFile();
    console.log("main() ends");
  }
  module.exports=updateseg;
module.exports=readJsonFile;
  //main();
   String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
  };
