const oracledb = require('oracledb');
const fs = require('fs');
const dbconfig = require('../dbconfig');
async function forwardCalculateProcedure(travelDate,filename,tenant) {
  let connection;

  try {
    console.log('Connecting to the Oracle database...');
    connection=await oracledb.getConnection(dbconfig[tenant]);
    console.log('Connected to the Oracle database.');

    const formattedTravelDate = formatTravelDate(travelDate);

    // Read the out.json file
    const filePath = `/var/www/html/GSE2/Schedules/${filename}`;
    const jsonData = await readJsonFile(filePath);

    // Extract segment IDs based on the specified conditions
    const segmentIds = getSegmentIds(jsonData,tenant);

    // Prepare the statement to execute the stored procedure
    const sql = `BEGIN
                   DEV.ITMS9_CALCULATOR.FORWARD_CALCULATE (:segmentId, :travelDate, 'GSE2', 'Y', '', '', :aOutVariable);
                 END;`;
 
    // Execute the stored procedure for each segment ID
    for (const segmentId of segmentIds) {
      // Declare a variable to hold the OUT parameter value
      let aOutVariable;

      const binds = {
        segmentId,
        travelDate: formattedTravelDate,
        aOutVariable: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };

      console.log(`Executing stored procedure for segment ${segmentId}...`);
      const result = await connection.execute(sql, binds);

      // Retrieve the OUT parameter value
      aOutVariable = result.outBinds.aOutVariable;
      
      console.log(`Stored procedure executed successfully for segment ${segmentId}`);
      console.log('OUT Parameter Value:', aOutVariable);
    }
  } catch (error) {
    console.error('Error executing stored procedure:', error);
  } finally {
    console.log('Closing the Oracle database connection...');
    if (connection) {
      try {
        await connection.close();
        console.log('Oracle database connection closed.');
      } catch (err) {
        console.error('Error closing the Oracle connection:', err);
      }
    }
  }
}

// Helper function to read JSON file
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    throw error;
  }
}

function formatTravelDate(inputDate) {
  const [day, month, year] = inputDate.split('-');
  const monthMap = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12',
  };

  const formattedMonth = monthMap[month.toUpperCase()];
  return `${formattedMonth}/${day}/${year}`;
}

// Helper function to extract segment IDs based on specified conditions
function getSegmentIds(jsonData,tenant) {
  const segmentIds = [];

  // Iterate through routes
  for (const route of jsonData.routes) {
    const vehicleId = route.vehicle;
    
    // Generate segment ID based on tenant
    let segmentId;
    if (tenant === 'NOTA') {
      segmentId = 'S' + (Math.floor(vehicleId/100) < 10 ? '00' : '0') + Math.floor(vehicleId/100);
    }else if (tenant === 'RTAIA') {
      segmentId = 'S' + Math.floor(vehicleId/100);
    } else {
      segmentId = 'S' + vehicleId;
    }

    // Add the ID to the array
    segmentIds.push(segmentId);   
}

  return segmentIds;
}

// Export the function for use in other modules
module.exports = forwardCalculateProcedure;
