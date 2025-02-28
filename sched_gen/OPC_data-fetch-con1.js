/* Version Info
-----Version-1.5----
*/

const oracledb = require('oracledb');
const fs = require('fs');
const dbConfig = require('../dbconfig');
const serializeInputData = require('./input-serialise');

/**
 * --------------------------------------------------------------------------
 * SQL QUERIES
 * --------------------------------------------------------------------------
 */
const sqlQuery1 = (travelDate) => `
  SELECT s.segmentid,
         s.OPER_ID,
         v.WC_CAP,
         v.AMB_CAP,
         v.WC_FACTOR,
         v.MODEL AS VEH_MODEL,
         s.DESCR,
         s.DRIVERID AS DRIVERID,
         a.GRIDLONG AS VEH_START_LONG,
         a.GRIDLAT AS VEH_START_LAT,
         b.GRIDLONG AS VEH_END_LONG,
         b.GRIDLAT AS VEH_END_LAT,
         START_TIME * 60 AS VEH_START,
         END_TIME * 60 AS VEH_END
    FROM itms_segment s
    JOIN itms_vehicle v ON s.vehicleid = v.VEH_ID
    JOIN ITMS_ALIAS a ON s.ALIAS_START = a.ALIAS
    JOIN ITMS_ALIAS b ON s.ALIAS_END = b.ALIAS
   WHERE s.travel_date = '${travelDate}'
     AND s.DISPOSITION = 'T'
     AND s.vehicleid = v.VEH_ID
     AND s.OPER_ID = 'OPC'
     AND s.segmentid NOT IN (
       SELECT t.RES_NUM
         FROM ITMS_TRIPS t
        WHERE DISPOSITION='T'
          AND t.travel_date = '${travelDate}'
          AND t.OPER_ID = 'OPC'
          AND t.group_id IS NOT NULL
          AND t.route_type = 'L'
     )
`;

const sqlQuery6 = (travelDate) => `
  SELECT x.*,
         s.OPER_ID,
         s.START_TIME * 60 AS seg_start_time,
         s.END_TIME * 60 AS seg_end_time,
         va.GRIDLAT AS veh_start_lat,
         va.GRIDLONG AS veh_start_long,
         vd.GRIDLAT AS veh_end_lat,
         vd.GRIDLONG AS veh_end_long,
         s.DRIVERID,
         sa.GRIDLAT AS s_lat,
         sa.GRIDLONG AS s_lng,
         ea.GRIDLAT AS e_lat,
         ea.GRIDLONG AS e_lng,
         v.WC_CAP,
         v.AMB_CAP,
         v.MODEL AS VEH_MODEL,
         d.WC_CAPABLE
    FROM (
           SELECT t.travel_date,
                  t.res_num AS SEGMENT_ID,
                  MIN(t.PU_STOP) pu_stop,
                  MAX(t.do_stop) do_stop,
                  group_id,
                  SUBSTR(MAX(t.tripid) KEEP (DENSE_RANK LAST ORDER BY t.do_stop),2) AS tripid,
                  MIN(
                      CASE
                        WHEN t.PU_ETD IS NOT NULL THEN (t.PU_ETD - 6)*60
                        ELSE t.start_time * 60
                      END
                  ) AS start_time,
                  MAX(
                      CASE
                        WHEN t.DO_ETD IS NOT NULL THEN t.DO_ETD*60
                        ELSE t.desired_end_time * 60
                      END
                  ) AS end_time
             FROM itms_trips t
             JOIN itms_segment s ON s.SEGMENTID = t.res_num
            WHERE t.TRAVEL_DATE = '${travelDate}'
              AND t.DISPOSITION = 'T'
              AND t.GROUP_ID IS NOT NULL
              AND t.RES_NUM IS NOT NULL
              AND t.res_num NOT IN ('S9998', 'S9999')
              AND t.route_type = 'L'
         GROUP BY t.travel_date, t.res_num, t.group_id
         ) x
    JOIN itms_segment s ON s.TRAVEL_DATE = x.TRAVEL_DATE
                       AND s.SEGMENTID = x.SEGMENT_ID
                       AND s.DISPOSITION = 'T'
    JOIN itms_trips pt ON pt.TRAVEL_DATE = '${travelDate}'
                      AND pt.res_num = x.SEGMENT_ID
                      AND pt.pu_stop = x.pu_stop
    JOIN itms_trips dt ON dt.TRAVEL_DATE = pt.TRAVEL_DATE
                      AND dt.res_num = x.SEGMENT_ID
                      AND dt.do_stop = x.do_stop
    JOIN itms_alias sa ON pt.alias_s = sa.alias
    JOIN itms_alias ea ON dt.alias_e = ea.alias
    JOIN itms_alias va ON s.ALIAS_START = va.ALIAS
    JOIN itms_alias vd ON s.ALIAS_END = vd.ALIAS
    JOIN itms_vehicle v ON s.vehicleid = v.VEH_ID
    JOIN ITMS_DRIVER_PROFILE_TEMPLATE d ON d.DRIVERID = s.DRIVERID
 ORDER BY x.SEGMENT_ID, x.PU_STOP
`;

const sqlQuery2 = (travelDate) => `
  SELECT t.RES_NUM,
         t.TRIPID,
         t.OPER_ID,
         t.CLIENTID,
         t.PU_STOP as PU_STOP,
         t.RETURN_TRIP,
         COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME),
         t.END_TIME,
         a.GRIDLONG AS PU_LONG,
         a.GRIDLAT AS PU_LAT,
         b.GRIDLONG AS DO_LONG,
         b.GRIDLAT AS DO_LAT,
         a.CITYTOWN AS PU_CITYTOWN,
         b.CITYTOWN AS DO_CITYTOWN,
         t.MOBILITY_LIST AS MOBILITY_LIST,
         (CASE
            WHEN t.return_trip = 'N'
            THEN ( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) - r.DIALRIDEEARLYPICKFACTOR) * 60
            WHEN t.return_trip = 'Y'
            THEN ( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) - r.OTHEREARLYPICKFACTOR ) * 60
          END) AS PU_START,
         (CASE
            WHEN t.return_trip = 'N'
            THEN ( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) + r.DIALRIDELATEPICKFACTOR ) * 60
            WHEN t.return_trip = 'Y'
            THEN ( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) + r.OTHERLATEPICKFACTOR ) * 60
          END) AS PU_END,
         (
           DECODE (
             NVL(t.DESIRED_END_TIME, 0),
             0, NVL( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME), 0),
             t.DESIRED_END_TIME - r.MAXEARLYDROPOFFFACTOR
           )
         ) * 60 AS DO_START,
         (
           (
             CASE
               WHEN NVL(t.DESIRED_END_TIME, 0) = 0 THEN
                 CASE
                   WHEN ( NVL(t.END_TIME, 0) + (
                         CASE
                           WHEN t.est_distance <= r.MEDIUMSHORTDISTANCE THEN r.SHORTTRIPTIME
                           WHEN t.est_distance <= r.MEDIUMLONGDISTANCE THEN r.MEDIUMTRIPTIME
                           ELSE r.LONGTRIPTIME
                         END
                       )
                       - ( TO_NUMBER(NVL( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME), 0)))
                     ) > r.LONGTRIPTIME
                   THEN ( TO_NUMBER(NVL( COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME), 0)) + r.LONGTRIPTIME )
                   ELSE NVL(t.END_TIME, 0) + (
                     CASE
                       WHEN t.est_distance <= r.MEDIUMSHORTDISTANCE THEN r.SHORTTRIPTIME
                       WHEN t.est_distance <= r.MEDIUMLONGDISTANCE THEN r.MEDIUMTRIPTIME
                       ELSE r.LONGTRIPTIME
                     END
                   )
                 END
               ELSE t.DESIRED_END_TIME
             END
           ) * 60
         ) AS DO_END,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'AMB') = 'Y' THEN 'Y' ELSE 'N' END AS IS_AMB,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'WC') = 'Y' THEN 'Y' ELSE 'N' END AS IS_WC,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'SC') = 'Y' THEN 'Y' ELSE 'N' END AS IS_SC,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'XLW') = 'Y' THEN 'Y' ELSE 'N' END AS IS_XLW,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'PCA') = 'Y' THEN 'Y' ELSE 'N' END AS IS_PCA,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'ES') = 'Y' THEN 'Y' ELSE 'N' END AS IS_ES,
         CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'AMBL') = 'Y'
              THEN 'Y' ELSE 'N' END AS IS_LIFT,
         t.ESCORT_NUM AS ESC_COUNT,
         r.EXTRA_LOADTIME AS XLT_LOAD_TIME,
         r.AMBLOAD AS AMB_LOAD,
         r.WHEELLOAD AS WC_LOAD,
         DECODE(NVL(GRP_CNT_WC, 0) + NVL(GRP_CNT_AMB, 0), 0, 'N', 'Y') AS ADDL_PSNGR,
         NVL(GRP_CNT_WC, 0) AS ADDL_PSNGR_WC,
         NVL(GRP_CNT_AMB, 0) AS ADDL_PSNGR_AMB
    FROM ITMS_TRIPS t
    JOIN ITMS_ALIAS a ON t.ALIAS_S = a.ALIAS
    JOIN ITMS_ALIAS b ON t.ALIAS_E = b.ALIAS
    JOIN ITMS_REGISTRY r ON r.CLIENT = 'PARATRANSIT_DFLT'
   WHERE TRAVEL_DATE = '${travelDate}'
     AND DISPOSITION = 'T'
     AND t.OPER_ID = 'OPC'
     AND NVL(t.start_time, 0) + NVL(t.desired_end_time, 0) <> 0
     AND NVL(t.route_type, '*' ) <> NVL('L', '*')
`;

const sqlQuery3 = (travelDate) => `
  SELECT t.RES_NUM AS RES_NUM , t.TRIPID,t.CLIENTID,t.RETURN_TRIP,
  a.GRIDLONG AS PU_LONG, a.GRIDLAT AS PU_LAT, b.GRIDLONG AS DO_LONG, b.GRIDLAT AS DO_LAT,
    CASE
      WHEN t.RETURN_TRIP = 'Y' THEN COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) * 60
      ELSE (COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) - 30) * 60
    END AS PU_START,
    CASE
      WHEN t.RETURN_TRIP = 'Y' THEN (COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) + 30) * 60
      ELSE (COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) + 55) * 60
    END AS PU_END,
    (DECODE(NVL(t.DESIRED_END_TIME, 0),
             0,
             NVL(COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME), 0),
             t.DESIRED_END_TIME - 30)) * 60 AS DO_START,
    CASE
      WHEN NVL(t.DESIRED_END_TIME, 0) = 0 THEN
        CASE
          WHEN NVL(t.END_TIME, 0) + (
            CASE
              WHEN t.est_distance <= 10 THEN 5 * 12
              WHEN t.est_distance <= 22 THEN 7.5 * 12
              ELSE 10 * 12
            END
          ) - NVL(COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME), 0) > 160
          THEN (COALESCE(NULLIF(t.START_TIME, 0), t.EST_PU_TIME) + 160)
          ELSE NVL(t.END_TIME, 0) + (
            CASE
              WHEN t.est_distance <= 10 THEN 5 * 12
              WHEN t.est_distance <= 22 THEN 7.5 * 12
              ELSE 10 * 12
            END
          )
        END
      ELSE t.DESIRED_END_TIME
    END * 60 AS DO_END,
  CASE WHEN DEV.ITMS7_CHECKMOBILITY(t.MOBILITY_LIST, 'WC')='Y' THEN 'Y' ELSE 'N' END AS IS_WC
  FROM ITMS_TRIPS t, ITMS_ALIAS a, itms_alias b
  WHERE TRAVEL_DATE= '${travelDate}'
    AND DISPOSITION ='T'
    AND t.RES_NUM IS NULL
    AND t.OPER_ID='OPC'
    AND t.ALIAS_S = a.ALIAS
    AND t.ALIAS_E = b.alias
`;

/**
 * --------------------------------------------------------------------------
 * HELPER FUNCTIONS
 * --------------------------------------------------------------------------
 */
function isOverlapping(window1, window2) {
  return window1[0] <= window2[1] && window1[1] >= window2[0];
}

function createShipmentFromConfig(config) {
  return {
    amount: config.amount,
    skills: config.skills,
    priority: config.priority,
    pickup: {
      id: config.pickup.id,
      location: config.pickup.location,
      description: config.pickup.description,
      service: config.pickup.service,
      time_windows: config.pickup.time_windows
    },
    delivery: {
      id: config.delivery.id,
      location: config.delivery.location,
      description: config.delivery.description,
      service: config.delivery.service,
      time_windows: config.delivery.time_windows
    }
  };
}

function matchShipmentsWithVehicles(shipments, vehicles) {
  let matchedVehicles = vehicles.filter(vehicle =>
    shipments.some(shipment => shipment.skills && shipment.skills.includes(vehicle.id))
  );

  shipments.forEach(shipment => {
    matchedVehicles.forEach(vehicle => {
      if (shipment.skills && shipment.skills.includes(vehicle.id)) {
        shipment.amount = [...vehicle.capacity];
        shipment.priority = 100;
        if (!vehicle.steps) {
          vehicle.steps = [];
        }
        if (vehicle.steps.length === 0 || vehicle.steps[0].type !== "start") {
          vehicle.steps.unshift({ type: "start" });
        }
        vehicle.steps.push({ type: "pickup", id: shipment.pickup.id });
        vehicle.steps.push({ type: "delivery", id: shipment.delivery.id });
      }
    });
  });

  matchedVehicles.forEach(vehicle => {
    if (vehicle.steps && vehicle.steps[vehicle.steps.length - 1].type !== "end") {
      vehicle.steps.push({ type: "end" });
    }
  });

  return shipments.filter(shipment =>
    shipment.skills && matchedVehicles.some(vehicle => shipment.skills.includes(vehicle.id))
  );
}

function fetchBRKs(breakWindow, jsonData, segmentid, breakduration) {
  // (Omitted for brevity, unchanged)
}

function breakWindowCheck(segEnd, segStart, groupParsedData, Segment_id, all_breakSegments, addBreakSeg, operIdScenario) {
  // (Omitted for brevity, unchanged)
}

/**
 * --------------------------------------------------------------------------
 * SUB-FUNCTIONS FOR OPC FETCH
 * --------------------------------------------------------------------------
 */

/**
 * 1) Fetch NON-preassigned vehicles => from sqlQuery1
 */
async function fetchVehicles(connection, travelDate, thejdata) {
  const vehicles = [];
  const query = sqlQuery1(travelDate);
  const result = await connection.execute(query);
  const rows = result.rows;

  rows.forEach(row => {
    const segmentid = Number(row[result.metaData.findIndex((m) => m.name === "SEGMENTID")].replace('S', ''));
    const segStart = parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_START")]);
    const segEnd   = parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_END")]);

    const ambcap = Number(row[result.metaData.findIndex((m) => m.name === "AMB_CAP")]);
    const wccap  = Number(row[result.metaData.findIndex((m) => m.name === "WC_CAP")]);

    // Check vehicle MODEL for "LIFT"
    const modelIndex = result.metaData.findIndex((m) => m.name === "VEH_MODEL");
    let vehicleModel = modelIndex !== -1 ? row[modelIndex] : ""; 

    const capacity = [ambcap, wccap];
    const startLocation = [
      parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_START_LONG")]),
      parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_START_LAT")])
    ];
    const endLocation = [
      parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_END_LONG")]),
      parseFloat(row[result.metaData.findIndex((m) => m.name === "VEH_END_LAT")])
    ];
    const description = row[result.metaData.findIndex((m) => m.name === "OPER_ID")];

    let vehicleObject = {
      id: segmentid * 100,
      start: startLocation,
      end: endLocation,
      description: description + " 1 999",
      skills: [segmentid * 100],
      capacity,
      speed_factor: Number(thejdata.speedfactor) / 100,
      time_window: [segStart, segEnd]
    };

    // If MODEL includes 'LIFT', add skill 6969
    if (vehicleModel && vehicleModel.toUpperCase().includes("LIFT")) {
      vehicleObject.skills.push(6969);
    }

    vehicles.push(vehicleObject);
  });

  return vehicles;
}

/**
 * 2) Fetch PRE-assigned segments => from sqlQuery6 => modifies vehicles
 */
async function fetchPreassignedSegments(connection, travelDate, vehicles) {
  const query = sqlQuery6(travelDate);
  const result6 = await connection.execute(query);

  for (let i = 0; i < result6.rows.length; i++) {
    let row = result6.rows[i];
    const puStop = Number(row[result6.metaData.findIndex((m) => m.name === "PU_STOP")]);
    const doStop = Number(row[result6.metaData.findIndex((m) => m.name === "DO_STOP")]);
    const segIdIndex = result6.metaData.findIndex((m) => m.name === "SEGMENT_ID");
    let segmentid = Number(row[segIdIndex].replace('S', ''));

    // capacity
    const ambcap = Number(row[result6.metaData.findIndex((m) => m.name === "AMB_CAP")]);
    const wccap  = Number(row[result6.metaData.findIndex((m) => m.name === "WC_CAP")]);
    const capacity = [ambcap, wccap];

    // times
    let segStart = parseFloat(row[result6.metaData.findIndex((m) => m.name === "SEG_START_TIME")]);
    let segEnd   = parseFloat(row[result6.metaData.findIndex((m) => m.name === "START_TIME")]);
    const description = row[result6.metaData.findIndex((m) => m.name === "OPER_ID")];

    // Check vehicle MODEL for "LIFT"
    const modelIndex = result6.metaData.findIndex((m) => m.name === "VEH_MODEL");
    let vehicleModel = modelIndex !== -1 ? row[modelIndex] : ""; 

    // Coordinates
    let endLocation = [
      parseFloat(row[result6.metaData.findIndex((m) => m.name === "S_LNG")]),
      parseFloat(row[result6.metaData.findIndex((m) => m.name === "S_LAT")])
    ];
    let startLocation = [
      parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LNG")]),
      parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LAT")])
    ];

    // Check if new segment or continuing
    let previousSegmentId = 0;
    if (i > 0) {
      const rowBefore = result6.rows[i - 1];
      previousSegmentId = Number(rowBefore[segIdIndex].replace('S', ''));
    }

    // Helper to create a sub-vehicle with potential LIFT skill
    function createVehicleObj(id, sLoc, eLoc, desc, twStart, twEnd) {
      let obj = {
        id,
        skills: [id],
        start: sLoc,
        end: eLoc,
        description: desc,
        capacity,
        time_window: [twStart, twEnd]
      };
      // If MODEL includes 'LIFT', add skill 6969
      if (vehicleModel && vehicleModel.toUpperCase().includes("LIFT")) {
        obj.skills.push(6969);
      }
      return obj;
    }

    if (i === 0 || segmentid !== previousSegmentId) {
      // FIRST sub-vehicle
      const firstVehicleId = segmentid * 100 + 10;
      segStart = parseFloat(row[result6.metaData.findIndex((m) => m.name === "SEG_START_TIME")]);
      startLocation = [
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "VEH_START_LONG")]),
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "VEH_START_LAT")])
      ];
      let firstVehicleObject = createVehicleObj(
        firstVehicleId,
        startLocation,
        endLocation,
        description + " " + 1 + " " + puStop,
        segStart,
        segEnd
      );
      vehicles.push(firstVehicleObject);

      // SECOND sub-vehicle
      const secondVehicleId = segmentid * 100 + 20;
      segStart = parseFloat(row[result6.metaData.findIndex((m) => m.name === "END_TIME")]);
      segEnd   = parseFloat(row[result6.metaData.findIndex((m) => m.name === "SEG_END_TIME")]);
      startLocation = [
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LNG")]),
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LAT")])
      ];
      endLocation = [
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "VEH_END_LONG")]),
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "VEH_END_LAT")])
      ];
      let secondVehicleObject = createVehicleObj(
        secondVehicleId,
        startLocation,
        endLocation,
        description + " " + doStop + " " + 999,
        segStart,
        segEnd
      );
      vehicles.push(secondVehicleObject);

    } else {
      // continuing the same segment => chain to the last vehicle
      let lastVehicle = vehicles[vehicles.length - 1];
      const newSegStart = parseFloat(row[result6.metaData.findIndex((m) => m.name === "END_TIME")]);
      const newSegEnd   = lastVehicle.time_window[1];
      let newStartLocation = [
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LAT")]),
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "E_LNG")])
      ];

      const appendedVehicleId = lastVehicle.id + 10;
      let appendedVehicle = createVehicleObj(
        appendedVehicleId,
        newStartLocation,
        lastVehicle.end,
        description + " " + doStop + " " + 999,
        newSegStart,
        newSegEnd
      );
      vehicles.push(appendedVehicle);

      // Adjust last vehicle�s end/time_window
      lastVehicle.time_window[1] = parseFloat(row[result6.metaData.findIndex((m) => m.name === "START_TIME")]);
      lastVehicle.end = [
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "S_LNG")]),
        parseFloat(row[result6.metaData.findIndex((m) => m.name === "S_LAT")])
      ];
      lastVehicle.description = lastVehicle.description.replace("999", puStop);
    }
  }
}

/**
 * 3) Fetch trips => from sqlQuery2 => build shipments
 */
async function fetchTripsAndBuildShipments(connection, travelDate, thejdata, vehicles) {
  let shipments = [];
  const query = sqlQuery2(travelDate);
  const result = await connection.execute(query);
  const rows = result.rows;

  rows.forEach(row => {
    const tripId = row[result.metaData.findIndex(m => m.name === "TRIPID")];
    const puLong = row[result.metaData.findIndex(m => m.name === "PU_LONG")];
    const puLat  = row[result.metaData.findIndex(m => m.name === "PU_LAT")];
    const doLong = row[result.metaData.findIndex(m => m.name === "DO_LONG")];
    const doLat  = row[result.metaData.findIndex(m => m.name === "DO_LAT")];

    const puStart = row[result.metaData.findIndex(m => m.name === "PU_START")];
    const puEnd   = row[result.metaData.findIndex(m => m.name === "PU_END")];
    const doStart = row[result.metaData.findIndex(m => m.name === "DO_START")];
    const doEnd   = row[result.metaData.findIndex(m => m.name === "DO_END")];

    const isAmb   = row[result.metaData.findIndex(m => m.name === "IS_AMB")];
    const isWc    = row[result.metaData.findIndex(m => m.name === "IS_WC")];
    const isSc    = row[result.metaData.findIndex(m => m.name === "IS_SC")];
    const isPca   = row[result.metaData.findIndex(m => m.name === "IS_PCA")];
    const isEs    = row[result.metaData.findIndex(m => m.name === "IS_ES")];
    const isXlw   = row[result.metaData.findIndex(m => m.name === "IS_XLW")];
    
    // NEW: isLift
    const isLiftIndex = result.metaData.findIndex(m => m.name === "IS_LIFT");
    const isLift = (isLiftIndex !== -1) ? row[isLiftIndex] : "N";

    const escCount = row[result.metaData.findIndex(m => m.name === "ESC_COUNT")];
    const ambload  = row[result.metaData.findIndex(m => m.name === "AMB_LOAD")];
    const wcload   = row[result.metaData.findIndex(m => m.name === "WC_LOAD")];

    // Possibly get RES_NUM & PU_STOP
    const resnum = row[result.metaData.findIndex(m => m.name === "RES_NUM")];
    const puStop = Number(row[result.metaData.findIndex(m => m.name === "PU_STOP")]) || 0;

    // Build "amount" array
    let amountArray = [0, 0];
    if (isWc === "Y" || isXlw === "Y") {
      amountArray[1] += 1;
    } else {
      amountArray[0] += 1;
    }
    if (isPca === "Y") {
      amountArray[0] += 1;
    }
    if (isEs === "Y") {
      amountArray[0] += escCount;
    }

    // Determine service times
    let puServiceTime = ambload * 60;
    let doServiceTime = ambload * 60;
    if (isWc === "Y" || isSc === "Y" || isXlw === "Y") {
      puServiceTime = wcload * 60;
      doServiceTime = wcload * 60;
    } else if (isAmb === "Y") {
      puServiceTime = ambload * 60;
      doServiceTime = ambload * 60;
    }

    // Build skill array
    let skillsArray = [];

    // If preassigned
    if (resnum) {
      let numericResnum = Number(resnum.replace('S', ''));
      let matchingVehicle = vehicles.find(vehicle => vehicle.id === numericResnum * 100);

      if (!matchingVehicle) {
        // try offset of +10
        let index = vehicles.findIndex(vehicle => vehicle.id === numericResnum * 100 + 10);
        if (index !== -1) {
          for (let i = index; i < vehicles.length; i++) {
            let descArray = vehicles[i].description.split(" ");
            let doStopVal = Number(descArray[1]) || 0;
            let maxStop   = Number(descArray[2]) || 0;
            if (doStopVal < puStop && maxStop > puStop) {
              skillsArray = [vehicles[i].id];
              break;
            }
          }
        }
      } else {
        skillsArray = [matchingVehicle.id];
      }
    }

    // If LIFT trip => add skill 6969
    if (isLift === "Y") {
      skillsArray.push(6969);
    }

    let shipment = {
      amount: amountArray,
      skills: skillsArray,
      priority: skillsArray.length > 0 ? 100 : 0,
      pickup: {
        id: Number(tripId.replace("T", "")),
        description: resnum != null ? "SO pickup" : "pickup",
        service: Number(puServiceTime),
        location: [puLong, puLat],
        ...(puStart && puStart > 0 ? { time_windows: [[puStart, puEnd]] } : {})
      },
      delivery: {
        id: Number(tripId.replace("T", "")),
        description: resnum != null ? "SO delivery" : "delivery",
        service: Number(doServiceTime),
        location: [doLong, doLat],
        ...(doStart && doStart > 0 ? { time_windows: [[doStart, doEnd]] } : {})
      }
    };

    shipments.push(shipment);
  });

  return shipments;
}

/**
 * --------------------------------------------------------------------------
 * MAIN FUNCTION
 * --------------------------------------------------------------------------
 */
async function opcfetchData(travelDate, operIdScenario, tenant, thejdata) {
  let connection;
  let vehicles = [];
  let shipments = [];
  let unassigned = 0;             // define unassigned
  let serializedInputFile = "";   // define serializedInputFile

  try {
    console.log("Starting data fetch for OPC scenario (v1.4) ...");

    // 1. DB Connection
    connection = await oracledb.getConnection(dbConfig[tenant]);
    console.log("Oracle DB connection established.");

    // 2. Fetch Non-Preassigned Vehicles
    vehicles = await fetchVehicles(connection, travelDate, thejdata);

    // 3. Fetch Preassigned Segments => modifies vehicles
    await fetchPreassignedSegments(connection, travelDate, vehicles);

    // Distinct segment IDs
    const idsDividedBy100 = vehicles.map(vehicle => Math.floor(vehicle.id / 100));
    const distinctIds = new Set(idsDividedBy100);

    // 4. Fetch Trips => build shipments
    shipments = await fetchTripsAndBuildShipments(connection, travelDate, thejdata, vehicles);

    // Also fetch unassigned from sqlQuery3
    const query3 = sqlQuery3(travelDate);
    const result2 = await connection.execute(query3);
    const rows2 = result2.rows;
    unassigned = rows2.length;

    // 5. Build final JSON => serialize
    const options = { g: false };
    const jsonData = { vehicles, shipments, options };
    serializedInputFile = await serializeInputData(jsonData, operIdScenario, travelDate, tenant);
    console.log(`Serialized Input file created at: ${serializedInputFile}`);

    // Also write to file for reference
    const filename = "/var/www/html/GSE2/sched_gen/input-auto.json";
    fs.writeFileSync(filename, JSON.stringify(jsonData, null, 3));
    console.log(`File ${filename} created successfully.`);

    // Return some counters
    return [distinctIds.size, unassigned, serializedInputFile];

  } catch (error) {
    console.error("Error fetching data (OPC v1.4):", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
      console.log("Oracle DB connection closed.");
    }
  }
}

module.exports = opcfetchData;
