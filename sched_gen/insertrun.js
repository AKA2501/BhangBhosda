/*Version Info
-----Version-1.2----
*/
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const dbconfig = require('../dbconfig');

async function insertSchedulingRunInfo(travelDate, jdata, filename,tenant) {
    let connection;
    try {
       connection=await oracledb.getConnection(dbconfig[tenant]);

        // Input Validation
        if (jdata.length === 0) {
            console.error('Empty jdata. Cannot process.');
            return; 
        }
        console.log(jdata[0].operator);
        let routes=parseJsonFile(filename,jdata[0].operator);
        // Process Input Data
        const dataForProcedure = {
            userId: jdata[0].userid, // Take USER_ID directly
            operId: '',// Initialize operId for concatenation
            speedFactor: Infinity,  // Initialize for finding the lowest value
            maxTasks: -Infinity, // Initialize for finding the highest value
            pAmbLoad: jdata[0].amb,   
            pWCLoad: jdata[0].wc,    
            pRun_FileName: routes,
            pStartTime: jdata[0].runStartTime
        };

        // Determine operId, speedFactor, and maxTasks
       /* if (jdata.length === 1) {
            // Case 1: Single object - Take operator directly (or default to 'ALL')
            dataForProcedure.operId = jdata[0].operator || 'ALL'; 
        } else if (jdata.length === 2) {
            // Case 2: Two objects - Combine unique operators with a comma 
            dataForProcedure.operId = [jdata[0].operator, jdata[1].operator].filter(Boolean).join(','); 
        } else { 
            // Case 3: Three or more objects - Use 'ALL'
            dataForProcedure.operId = 'ALL'; 
        }*/
      dataForProcedure.operId = jdata[0].operator

        // Calculate speedFactor (lowest) and maxTasks (highest)
        for (const obj of jdata) {
            if (parseFloat(obj.speedfactor) < dataForProcedure.speedFactor) {
                dataForProcedure.speedFactor = parseFloat(obj.speedfactor);
            }
            if (parseInt(obj.capacity, 10) > dataForProcedure.maxTasks) {
                dataForProcedure.maxTasks = parseInt(obj.capacity, 10);
            }
        }
        let formattedDate=formatDate(travelDate);
        let runNum=parseFilenameForSerialNumber(filename);
        // Log the prepared data
        console.log("Values before execution of the stored procedure:");
        console.log(dataForProcedure); 

        // Execute the Stored Procedure 
        const sql = `BEGIN ITMS8_GSE20.INSERT_SCHEDULING_RUN_INFO(:userId, :travelDate, :operId, :runnum, :speedFactor, :maxTasks, :pAmbLoad, :pWCLoad, :pRun_FileName,:pStartTime, :aOutVariable); END;`;
        const bindVars = {
            // Pass values from the dataForProcedure object
            userId: { dir: oracledb.BIND_IN, val: dataForProcedure.userId },
            travelDate: { dir: oracledb.BIND_IN, val: formattedDate },
            operId: { dir: oracledb.BIND_IN, val: dataForProcedure.operId },
            runnum: { dir: oracledb.BIND_IN, val: runNum },
            speedFactor: { dir: oracledb.BIND_IN, val: dataForProcedure.speedFactor },
            maxTasks: { dir: oracledb.BIND_IN, val: dataForProcedure.maxTasks },
            pAmbLoad: { dir: oracledb.BIND_IN, val: dataForProcedure.pAmbLoad },
            pWCLoad: { dir: oracledb.BIND_IN, val: dataForProcedure.pWCLoad },
            pRun_FileName:  { dir: oracledb.BIND_IN, val: dataForProcedure.pRun_FileName },
            pStartTime:  { dir: oracledb.BIND_IN, val: dataForProcedure.pStartTime },
            aOutVariable: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
        };
        const result = await connection.execute(sql, bindVars);

        // Process stored procedure output 
        console.log("Output value:", result.outBinds.aOutVariable);

        await connection.close();
    } catch (err) {
        console.error("Error executing procedure:", err);
    }
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
function parseFilenameForSerialNumber(filename) {
    const parts = path.basename(filename).split('_');
    const serialNumberWithExtension = parts[4].split('.')[0];
    return parseInt(serialNumberWithExtension, 10);
}

function parseJsonFile(filename,operator) {
    try {
      const data = fs.readFileSync(filename, 'utf8');
      const jsonData = JSON.parse(data);
      let routes=0;
      console.log("Distinct operator:",operator); 
     
      if(operator==='RTA8' || operator=='NOTA'){
       
      console.log("inside operator:",operator); 
        const idsDividedBy100 = jsonData.routes.map(route => Math.floor(route.vehicle / 100)); // Use a Set to count distinct values
        const distinctIds = new Set(idsDividedBy100); 
        console.log("Distinct Count:", distinctIds.size); 
        routes= distinctIds.size;
      }else{
         routes = jsonData.routes.length;
      }
  
      return routes;
    } catch (err) {
        console.error('Error reading or parsing the JSON file:', err);
        return null;
      }
    }
// Export the function
module.exports = insertSchedulingRunInfo;
