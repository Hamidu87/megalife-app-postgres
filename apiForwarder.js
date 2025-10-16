
/*
const axios = require('axios');

// This function will take a transaction from our database
// and forward it to the external API.
async function forwardTransaction(transaction) {
    console.log(`Forwarding transaction ID: ${transaction.id} to external API...`);

    // --- 1. Get API Credentials from our .env file ---
    // We will need to add these to our .env file
    const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
    const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;
    const EXTERNAL_RK_TOKEN = process.env.EXTERNAL_RK_TOKEN;

    if (!EXTERNAL_API_URL || !EXTERNAL_API_KEY || !EXTERNAL_RK_TOKEN) {
        throw new Error("Missing external API configuration in .env file.");
    }

    // --- 2. Translate our data to their format ---
    // This is where we match our database columns to their required parameters.
    
    // We'll need a simple mapping for network_id
    const networkMap = {
        'MTN': 3,
        'Telecel': 2,
        'AirtelTigo': 1 // Assuming iShare for now
        // 'AirtelTigo BigTime': 4
    };

    const requestBody = new URLSearchParams({
        'recipient_msisdn': transaction.recipient,
        'network_id': networkMap[transaction.type],
        'shared_bundle': transaction.details.replace('GB', '') * 1000, // e.g., '5GB' -> 5000
        'order_reference': `megalife_${transaction.orderId}` // Create a unique reference
    }).toString();

    // --- 3. Set up the request headers ---
    const requestHeaders = {
        'x-api-key': EXTERNAL_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'rk-api-token': EXTERNAL_RK_TOKEN
    };

    // --- 4. Make the API call ---
    try {
        const response = await axios.post(EXTERNAL_API_URL, requestBody, { headers: requestHeaders });
        
        console.log(`Successfully forwarded transaction ${transaction.id}. Response:`, response.data);
        return response.data; // Return the success response

    } catch (error) {
        console.error(`Failed to forward transaction ${transaction.id}.`);
        // Log the detailed error from the external server if available
        if (error.response) {
            console.error('API Error Response:', error.response.data);
        }
        throw error; // Re-throw the error so our worker knows it failed
    }
}

// Make the function available to other files (like server.js)
module.exports = { forwardTransaction };

*/


/*
const axios = require('axios');

// This function will take a transaction from our database
// and forward it to the external API.
async function forwardTransaction(transaction) {
    console.log(`Forwarding transaction ID: ${transaction.id} to external API...`);

    // --- 1. Get API Credentials from our .env file ---
    const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
    // We only need the one token now
    const EXTERNAL_RK_TOKEN = process.env.EXTERNAL_RK_TOKEN;

    if (!EXTERNAL_API_URL || !EXTERNAL_RK_TOKEN) {
        throw new Error("Missing external API configuration in .env file.");
    }

    // --- 2. Translate our data to their format (CORRECTED) ---
    
    // This regular expression finds the first number in a string.
    const detailsString = transaction.details || '';
    const numberMatch = detailsString.match(/\d+(\.\d+)?/);
    if (!numberMatch) {
        throw new Error(`Could not parse a number from bundle details: "${detailsString}"`);
    }
    const bundleSizeInGB = parseFloat(numberMatch[0]);
    const package_size = bundleSizeInGB * 1000; // Their system expects MB

    // This is the data we will send as JSON.
    const requestBody = {
        recipient: transaction.recipient,
        package_size: package_size,
        product: transaction.type.toLowerCase() // e.g., 'mtn', 'telecel'
    };

    // --- 3. Set up the request headers (CORRECTED) ---
    const requestHeaders = {
        'Content-Type': 'application/json', // CRITICAL: They expect JSON
        'rk-api-token': EXTERNAL_RK_TOKEN
    };

    console.log('--- Sending the following CORRECTED data to RKStores ---');
    console.log('URL:', EXTERNAL_API_URL);
    console.log('Headers:', requestHeaders);
    console.log('Body (JSON):', requestBody);
    console.log('----------------------------------------------------');

    // --- 4. Make the API call ---
    try {
        // Axios automatically sends the body as JSON when the header is set.
        const response = await axios.post(EXTERNAL_API_URL, requestBody, { headers: requestHeaders });
        
        console.log(`✅ Successfully forwarded transaction ${transaction.id}. Response:`, response.data);
        return response.data;

    } catch (error) {
        console.error(`❌ Failed to forward transaction ${transaction.id}.`);
        if (error.response) {
            console.error('--- RKSTORES API ERROR RESPONSE ---');
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('---------------------------------');
        } else {
            console.error('Network or other error:', error.message);
        }
        throw error;
    }
}

module.exports = { forwardTransaction };


*/









/*



const axios = require('axios');

// This is the final, correct version of the function in apiForwarder.js
async function forwardTransaction(transaction) {
    console.log(`Forwarding transaction ID: ${transaction.id} to external API...`);
    
    const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
    const EXTERNAL_RK_TOKEN = process.env.EXTERNAL_RK_TOKEN;

    if (!EXTERNAL_API_URL || !EXTERNAL_RK_TOKEN) {
        throw new Error("Missing external API configuration in .env file.");
    }

    // --- 1. DATA MAPPING (No Changes Needed Here) ---
    const productMap = { 'MTN': 'mtn', 'Telecel': 'telecel', 'AirtelTigo': 'at_bigtime' };
    const product = productMap[transaction.type];
    if (!product) throw new Error(`Invalid transaction type: "${transaction.type}"`);
    
    const detailsString = transaction.details || '';
    const numberMatch = detailsString.match(/\d+(\.\d+)?/);
    if (!numberMatch) throw new Error(`Could not parse number from details: "${detailsString}"`);
    const package_size = parseFloat(numberMatch[0]) * 1000;

    // --- 2. CREATE THE REQUEST BODY (CRITICAL FIX) ---
    // We use URLSearchParams to create an x-www-form-urlencoded string
    const requestBody = new URLSearchParams({
        recipient: transaction.recipient,
        package_size: package_size,
        product: product
    });

    // --- 3. SET UP THE HEADERS (CRITICAL FIX) ---
    const requestHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded', // Must be this
        'rk-api-token': EXTERNAL_RK_TOKEN
        // Note: The 'x-api-key' is NOT in their latest example, so we will omit it for now.
    };
    
    console.log('--- Sending final corrected FORM data to RKStores ---');
    console.log('URL:', EXTERNAL_API_URL);
    console.log('Headers:', requestHeaders);
    console.log('Body (Form Data):', requestBody.toString());
    console.log('----------------------------------------------------');

    // --- 4. MAKE THE API CALL ---
    try {
        // Axios needs to be told to send the body as a string when using this content type
        const response = await axios.post(EXTERNAL_API_URL, requestBody.toString(), { headers: requestHeaders });
        
        console.log(`✅ Successfully forwarded transaction ${transaction.id}. Response:`, response.data);
        return response.data;

    } catch (error) {
        console.error(`❌ Failed to forward transaction ${transaction.id}.`);
        if (error.response) {
            console.error('--- RKSTORES API ERROR RESPONSE ---');
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('---------------------------------');
        } else {
            console.error('Network or other error:', error.message);
        }
        throw error;
    }
}

module.exports = { forwardTransaction };


*/











const axios = require('axios');

async function forwardTransaction(transaction) {
    console.log(`Forwarding transaction ID: ${transaction.id} to external API...`);
    
    const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
    const EXTERNAL_RK_TOKEN = process.env.EXTERNAL_RK_TOKEN;

    if (!EXTERNAL_API_URL || !EXTERNAL_RK_TOKEN) {
        throw new Error("Missing external API configuration.");
    }

    // --- 1. DATA MAPPING ---
    const detailsString = transaction.details || '';
    const numberMatch = detailsString.match(/\d+(\.\d+)?/);
    if (!numberMatch) throw new Error(`Could not parse number from details: "${detailsString}"`);
    const package_size = parseFloat(numberMatch[0]) * 1000;

    // Based on their latest docs, 'product' is the correct parameter
    const productMap = {
        'MTN': 'mtn',
        'Telecel': 'telecel',
        'AirtelTigo': 'at_bigtime'
    };
    const product = productMap[transaction.type];
    if (!product) throw new Error(`Unmapped transaction type: "${transaction.type}"`);

    // --- 2. CREATE THE REQUEST BODY (as x-www-form-urlencoded) ---
    const requestBody = new URLSearchParams({
        recipient: transaction.recipient,
        package_size: package_size,
        product: product
    }).toString();

    // --- 3. SET UP THE HEADERS ---
    const requestHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'rk-api-token': EXTERNAL_RK_TOKEN
    };
    
    console.log('--- Sending final corrected FORM data to RKStores ---');
    console.log('URL:', EXTERNAL_API_URL);
    console.log('Headers:', requestHeaders);
    console.log('Body (Form Data):', requestBody);
    console.log('----------------------------------------------------');

    // --- 4. MAKE THE API CALL ---
    try {
        const response = await axios.post(EXTERNAL_API_URL, requestBody, { headers: requestHeaders });
        console.log(`✅ Successfully forwarded transaction ${transaction.id}. Response:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ Failed to forward transaction ${transaction.id}.`);
        if (error.response) {
            console.error('--- RKSTORES API ERROR RESPONSE ---');
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('---------------------------------');
        } else {
            console.error('Network or other error:', error.message);
        }
        throw error;
    }
}

module.exports = { forwardTransaction };