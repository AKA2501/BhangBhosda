const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const dbconfig = require('../dbconfig');

async function processFiles(travelDate, fileno,tenant) {
    const directoryPath = '/var/www/html/GSE2/Schedules';
    console.log(fileno);

    try {
        // Read all files in the directory
        const files = fs.readdirSync(directoryPath);
        const newDate=formatDate2(travelDate);
        const tenant1=tenant;

        //Remove underscores
        if (tenant.includes("_")) {
        console.log("Tenant contains underscores.");
        tenant = tenant.replace(/_/g, "");
        console.log(tenant);
        }

        // Construct the filename pattern (without the 'ALL' part)
        const filenamePattern = `out_${tenant}_.*_${newDate}_${fileno}.json`; 
        const filenameRegex = new RegExp(filenamePattern);

        // Find the matching file (using a regular expression)
        const matchingFile = files.find(file => filenameRegex.test(file));
        let formattedDate = formatDate(travelDate);

        // Verify the formatted date (for debugging)
        console.log("formattedDate:", formattedDate); 

        // Update RELOAD_ALL column in the database
        await updateDatabase(fileno, formattedDate,tenant1);

        // Return the matching filename
        return matchingFile;
    } catch (error) {
        console.error('Error processing files:', error);
        throw error;
    }
}

async function updateDatabase(fileno, formattedDate,tenant) {
    let connection; // Declare connection outside the try block
    
    try {
        connection = await oracledb.getConnection(dbconfig[tenant]);

        const updateQuery = `
            UPDATE ITMS_SCHEDULING_ORDER_SHM SET RELOAD_ALL = 1 WHERE SORDER = :fileno AND REGION = :formattedDate
        `;
        //let formattedDateString= formattedDate.toString();

        // Logging for debugging 
        //const finalQueryString = updateQuery.replace(':fileno', fileno).replace(':formattedDateString', `'${formattedDate}'`);
        //console.log("Final Executed Query:", finalQueryString); 
        let result=-1;
        result = await connection.execute(updateQuery, {fileno, formattedDate });
        await connection.commit(); 
        console.log('Database updated successfully:',result ,result.rowsAffected);

    } catch (error) {
        console.error('Error updating database:', error);
        throw error;
    } finally {
        // Close the connection
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing the connection:", err);
            }
        }
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
function formatDate2(originalDate) {
    const dateParts = originalDate.split('-'); // Split using '-'
    if (dateParts.length !== 3) {
      // Handle invalid input
      console.error("Invalid date format:", originalDate); 
      return null; 
    }
  
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthNumber = (monthNames.indexOf(dateParts[1].toUpperCase()) + 1).toString().padStart(2, '0'); 
    const formattedDate = `${monthNumber}${dateParts[0]}${dateParts[2].substring(2)}`; 
    return formattedDate;
  }

module.exports = processFiles;
