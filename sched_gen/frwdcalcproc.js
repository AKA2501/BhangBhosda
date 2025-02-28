/*Version Info
-----Version-1.0----
*/
const oracledb = require('oracledb');
const dbconfig = require('../dbconfig');

async function forwardCalculateProcedure(travelDate, tenant) {
  let connection;

  try {
    console.log('Connecting to the Oracle database...');
    connection = await oracledb.getConnection(dbconfig[tenant]);
    console.log('Connected to the Oracle database.');

    const formattedTravelDate = formatTravelDate(travelDate);

    // Extract segment IDs based on the specified conditions
    const segmentIds = await getSegmentIds(connection, travelDate);

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
async function getSegmentIds(connection, travelDate) {
  const segmentIds = [];
  const sql = `SELECT SEGMENTID FROM ITMS_SEGMENT WHERE TRAVEL_DATE = :travelDate AND DISPOSITION = 'T'`;
  const binds = { travelDate };

  try {
    const result = await connection.execute(sql, binds);
    for (const row of result.rows) {
      segmentIds.push(row[0]);
    }
  } catch (error) {
    console.error('Error fetching segment IDs:', error);
    throw error;
  }

  return segmentIds;
}

// Export the function for use in other modules
module.exports = forwardCalculateProcedure;