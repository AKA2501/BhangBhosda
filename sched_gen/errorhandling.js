/*Version Info
-----Version-1.0----
*/
const fs = require('fs');
const oracledb = require("oracledb");
const dbconfig = require('../dbconfig');
const axios = require('axios');
//const { error } = require('console');
//const thirdFileName = '/var/www/html/VROOM_JS/sched_gen/input-auto.json';

async function fetchBRKs(speedfactor,tenant,thirdFileName ) {
try {
    console.log("Reached error handling");
    const thirdData = fs.readFileSync(thirdFileName , 'utf8');
    const thirdJsonData = JSON.parse(thirdData);
    await parseShipmentData(thirdJsonData,speedfactor,tenant);
    fs.writeFileSync(thirdFileName, JSON.stringify(thirdJsonData, null, 2), 'utf8');
  } catch (err) {
    throw err;
  }
}

async function getDurations(pickupCoordslong, pickupCoordslat, deliveryCoordslong, deliveryCoordslat) {
  const coords = `${pickupCoordslong},${pickupCoordslat};${deliveryCoordslong},${deliveryCoordslat}`;
  const url = `http://localhost:5000/table/v1/driving/${coords}`;
  //console.log(url);
  try {
    const response = await axios.get(url);
    return response.data.durations;
  } catch (error) {
    console.error('Error fetching durations:', error);
    throw error;
  }
}


async function parseShipmentData(jsonData,speedfactor,tenant) {
//  const speedAdjustmentFactor= (200-parseFloat(speedfactor))/100;
  //const speedAdjustmentFactor= Math.ceil(parseFloat(100/speedfactor));
  //const speedAdjustmentFactor= Math.floor(100 / speedfactor);
  const speedAdjustmentFactor = Math.ceil((100 / speedfactor) * 100) / 100;
  //const speedAdjustmentFactor=1.25;
  console.log("speedAdjustmentFactor",speedAdjustmentFactor);


  const errorlog = [];

  try {
    //console.log(jsonData.vehicles);
//    for (const vehicle of jsonData.vehicles) {
    for (let j=0;j<jsonData.vehicles.length;j++) {
        const vehicle=jsonData.vehicles[j];
        if(vehicle.steps===undefined){
           continue; 
        }
        let time=vehicle.time_window[0];
        for(let i=0;i<vehicle.steps.length;i++){
            let matchingtrip = jsonData.shipments.find(shipment => shipment.pickup.id === vehicle.steps[i].id);
            if(vehicle.steps[i].type==='pickup'){
                matchingtrip=matchingtrip.pickup;
            }else{
                matchingtrip = matchingtrip.delivery;
            }
            if(i==0){
                const starttofirsttrip = await getDurations(vehicle.start[0], vehicle.start[1], matchingtrip.location[0], matchingtrip.location[1]);
                //time+= speedAdjustmentFactor*starttofirsttrip[0][1] + matchingtrip.service;

                if(time+speedAdjustmentFactor*starttofirsttrip[0][1]<matchingtrip.time_windows[0][0]){
                  time=matchingtrip.time_windows[0][0];
                }else{
                  time+=speedAdjustmentFactor*starttofirsttrip[0][1];
                }

                time+=matchingtrip.service;

                if(time> matchingtrip.time_windows[0][1]){
                    errorlog.push(`Issue in ${vehicle.steps[i].type} of T${matchingtrip.id} in S${vehicle.id} by ${Math.ceil((time-matchingtrip.time_windows[0][1])/60)} minutes`);
		    //errorlog.push(`Time window end before: ${matchingtrip.time_windows[0][1]}` );
                    //matchingtrip.time_windows[0][1]+=300+Math.ceil(time-matchingtrip.time_windows[0][1]);
 		    matchingtrip.time_windows[0][1]=Math.ceil(time);
		    //errorlog.push(`Time window end after: ${matchingtrip.time_windows[0][1]}` );
                }

            }else{
                let matchingtripbefore = jsonData.shipments.find(shipment => shipment.pickup.id === vehicle.steps[i-1].id);
                if(vehicle.steps[i-1].type==='pickup'){
                    matchingtripbefore=matchingtripbefore.pickup;
                }else{
                    matchingtripbefore = matchingtripbefore.delivery;
                }
                const starttofirsttrip = await getDurations(matchingtripbefore.location[0], matchingtripbefore.location[1], matchingtrip.location[0], matchingtrip.location[1]);
                //time+=speedAdjustmentFactor*starttofirsttrip[0][1] + matchingtrip.service;
                if(time+speedAdjustmentFactor*starttofirsttrip[0][1]<matchingtrip.time_windows[0][0]){
                  time=matchingtrip.time_windows[0][0];
                }else{
                  time+=speedAdjustmentFactor*starttofirsttrip[0][1];
                }
                time+=matchingtrip.service;
                if(time> matchingtrip.time_windows[0][1]){
                  errorlog.push(`Issue in ${vehicle.steps[i].type} of T${matchingtrip.id} in S${vehicle.id} by ${Math.ceil((time-matchingtrip.time_windows[0][1])/60)} minutes`);
                  //errorlog.push(`Time window end before: ${matchingtrip.time_windows[0][1]}` )
                  //matchingtrip.time_windows[0][1]+=Math.ceil(time-matchingtrip.time_windows[0][1])+300;
		  matchingtrip.time_windows[0][1]=Math.ceil(time);
                  //errorlog.push(`Time window end after: ${matchingtrip.time_windows[0][1]} `)
                }


                if(i==vehicle.steps.length-1){
                  const lasttriptoend = await getDurations(matchingtrip.location[0], matchingtrip.location[1],vehicle.end[0], vehicle.end[1]);
                time+= speedAdjustmentFactor*lasttriptoend[0][1] + matchingtrip.service;
                if(time >vehicle.time_window[1]){
                   // errorlog.push(`Issue in ${vehicle.steps[i].type} of T${matchingtrip.id} in S${vehicle.id} by ${Math.ceil((time-vehicle.time_window[1])/60)} minutes`);
                    errorlog.push(`Exceeding segment end time of S${vehicle.id} by ${Math.ceil((time-vehicle.time_window[1])/60)} minutes`);
                    //vehicle.time_window[1]+=Math.ceil(time-vehicle.time_window[1])+300;
                    vehicle.time_window[1]=Math.ceil(time);
		               //jsonData.vehicles.splice(j,1);
                }
                }
            }
            //errorlog.push(`Vehicle reached T${matchingtrip.id} in S${vehicle.id} at ${Math.ceil(time/60)} minutes`);
        }
      
    }
    console.log(errorlog);
    if(errorlog.length>0){
      let connection;
      try{
/*
        connection = await oracledb.getConnection(dbconfig[tenant]);
        const bindVars = {
//          pMessages: { type: oracledb.STRING, dir: oracledb.BIND_IN, val: errorlog},
          oIdentifier: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const formattederrorlog = errorlog.map(item => `'${item}'`).join(',\n');
        await connection.execute(
//          `BEGIN ITMS8_GSE20.LogArrayMessages(ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(errorlog).replaceAll("[","").replaceAll("]","")+`), :oIdentifier); END;`,
          `BEGIN ITMS8_GSE20.LogArrayMessages(ITMS8_GSE20.VAR_ARRAY(`+formattederrorlog+`), :oIdentifier); END;`,
          bindVars
        );
        console.log(bindVars.oIdentifier);
*/


/*
connection = await oracledb.getConnection(dbconfig[tenant]);
    const bindVars = {
        oIdentifier: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    
    // Format errorlog correctly if it's an array of strings or numbers
    const formattedErrorLog = errorlog.map(item => `'${item}'`).join(", ");
    console.log(formattedErrorLog);

    const query = `
        BEGIN
            ITMS8_GSE20.LogArrayMessages(
                ITMS8_GSE20.VAR_ARRAY(${formattedErrorLog}),
                :oIdentifier
            );
        END;
    `;

    // Execute the PL/SQL block with bind variables
    //await connection.execute(query, bindVars);
    const result = await connection.execute(query, bindVars, { autoCommit: true });


    console.log("Output Identifier:",result.outBinds.oIdentifier);
        throw new Error(""+result.outBinds.oIdentifier);
*/
      }catch(error){
        throw error;
      }finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
      }
    }
  } catch (error) {
    //console.error('Error setting time windows:', error);
    throw error;
  }
}

module.exports = fetchBRKs;