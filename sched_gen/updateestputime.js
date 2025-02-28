/*Version Info
-----Version-1.2----
*/
const oracledb = require("oracledb");
const dbConfig = require('../dbconfig');

// Function to call the stored procedure UpdateEstPuTime
async function callUpdateEstPuTime(pSrvDt, tenant) {
  const pAllRt = 'ALL'; // Hardcoded value
  //const pTenId = tenant; // Hardcoded value
  
  let connection;

  try {
    // Get the connection for the specified tenant
    connection = await oracledb.getConnection(dbConfig[tenant]);

    const bindVarsSrvDt = { pSrvDt: { val: pSrvDt } };
    
    let operators=[];

    if(tenant==='CCT'){
      operators=['CCT'];       
    }else if(tenant==='NOTA'){
      operators=['NOTA'];       
    }else if(tenant==='WOTA'){
      operators=['WOTA'];       
    }else if(tenant==='OPC'){
      operators=['OPC'];       
    }else if(tenant==='KCTS'){
      operators=['KCTS'];       
    }else if(tenant==='RTAIA'){
      operators=['RTA8'];       
    }

    for (const operator of operators) {
      const bindVarsProcedure = {
        pAllRt: { val: pAllRt },
        pOperId: { val: operator },  // Operator for the current loop
        pSrvDt: { val: pSrvDt }
      };

      // Call the stored procedure UpdateEstPuTime for each operator
      const result = await connection.execute(
        `BEGIN 
           dev.itms8_osrm.UpdateEstPuTime(:pAllRt, :pOperId, :pSrvDt); 
         END;`,
        bindVarsProcedure,
        { autoCommit: true }
      );
      console.log(`Stored procedure UpdateEstPuTime executed successfully for operator ${operator}.`);
    }

  } catch (err) {
    console.error("Error during database operation:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log("Connection closed successfully.");
      } catch (err) {
        console.error("Error closing the connection:", err);
      }
    }
  }
}

// Exported function to update estimated pickup times
async function updateEstimatedPickupTime(pSrvDt, tenant) {
  try {
    await callUpdateEstPuTime(pSrvDt, tenant);
    console.log('Estimated Pickup Times updated successfully!');
  } catch (error) {
    console.error('Error during the update process:', error);
  }
}

module.exports = updateEstimatedPickupTime;
