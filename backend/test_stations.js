import { fetchTrainStations, initRailSchema, ensureTrainExists } from './src/services/rail.service.js';

async function testStationFetching() {
    try {
        // console.log("🔄 Testing station fetching functionality...");
        
        // Initialize schema to ensure stations column exists
        await initRailSchema();
        
        // Test with a common train number (Rajdhani Express)
        const testTrainNumber = "12301";
        // console.log(`🚂 Testing with train number: ${testTrainNumber}`);
        
        // Test fetching stations directly
        const stations = await fetchTrainStations(testTrainNumber);
        // console.log(`📍 Found ${stations.length} stations:`);
        
        stations.slice(0, 5).forEach((station, index) => {
            // console.log(`  ${index + 1}. ${station.source_stn_name} (${station.source_stn_code}) - Arrives: ${station.arrive}, Departs: ${station.depart}`);
        });
        
        if (stations.length > 5) {
            // console.log(`  ... and ${stations.length - 5} more stations`);
        }
        
        // Test ensuring train exists (which should now include stations)
        // console.log("\n🔄 Testing ensureTrainExists with station data...");
        const result = await ensureTrainExists(testTrainNumber);
        // console.log(`✅ Train creation/update result: ${result}`);
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

// Run the test
testStationFetching();
