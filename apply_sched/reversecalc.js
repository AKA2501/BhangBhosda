const oracledb = require('oracledb');
//const fs = require('fs/promises');

async function forwardCalculateProcedure(travelDate) {
  let connection;

  try {
    console.log('Connecting to the Oracle database...');
    connection = await oracledb.getConnection({
      user: "RTD",
      password: "RTD",
      connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.5.125)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=rtd21pdb.fiftyfiveashprv.fiftyfive.oraclevcn.com)))",
    });
    console.log('Connected to the Oracle database.');

    const formattedTravelDate = formatTravelDate(travelDate);

    // Read the out.json file
    const filePath = `/var/www/html/GSE2/Schedules/${filename}`;
    const jsonData = await readJsonFile(filePath);

    // Extract segment IDs based on the specified conditions
    const segmentIds = getSegmentIds(jsonData);

    // Prepare the statement to execute the stored procedure
    const sql = `BEGIN
                   ITMS9_DISP360_SCHEDULING.REVERSE_CALCULATE (:segmentId, :travelDate, 'GSE2', 'Y', '', '', :aOutVariable);
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
    const data = await fs.readFile(filePath, 'utf8');
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
function getSegmentIds(jsonData) {
  const segmentIds = [];
  for (const route of jsonData.routes) {
    if (route.steps) {
      for (const step of route.steps) {
        if (step.type === 'break' && step.service > 0) {
          const segmentId = 'S' + step.id.toString(); // Append 'S' to the step ID
          segmentIds.push(segmentId);
        }
      }
    }
  }
  return segmentIds;
}

// Export the function for use in other modules
module.exports = forwardCalculateProcedure;
