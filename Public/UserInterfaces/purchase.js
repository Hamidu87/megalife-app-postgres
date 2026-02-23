/*
// This script handles the logic for data bundle purchase pages.
// This script handles the logic for data bundle purchase pages.
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // --- GET ELEMENTS ---
    const purchaseForm = document.getElementById('purchase-form');
    const bundleSelect = document.getElementById('bundle-size');
    const priceDisplay = document.getElementById('price-display');
    const walletBalanceEl = document.getElementById('wallet-balance');
    const phoneNumberInput = document.getElementById('phone-number');
    
    if (!purchaseForm || !bundleSelect) return;

    const provider = purchaseForm.getAttribute('data-provider');
    let originalOptionTexts = [];

    // --- FETCH AND DISPLAY CURRENT WALLET BALANCE ---
    async function fetchCurrentUserBalance() {
        if (!walletBalanceEl) return;
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch balance');
            const user = await response.json();
            walletBalanceEl.textContent = `GH₵ ${parseFloat(user.walletBalance).toFixed(2)}`;
        } catch (error) {
            console.error(error);
            walletBalanceEl.textContent = 'Error';
        }
    }

    // --- DYNAMICALLY POPULATE BUNDLE OPTIONS ---
    async function populateBundles() {
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/bundles');
            if (!response.ok) throw new Error('Could not load bundles.');
            const allBundles = await response.json();
            const providerBundles = allBundles.filter(bundle => bundle.provider === provider);

            bundleSelect.innerHTML = '<option value="" data-price="0">  Select a Bundle  </option>';

            providerBundles.forEach(bundle => {
                if (bundle.volume && bundle.price) {
                    const option = document.createElement('option');
                    option.value = bundle.volume;
                    option.setAttribute('data-price', bundle.price);
                    option.textContent = `${bundle.volume} - GHS ${parseFloat(bundle.price).toFixed(2)}`;
                    bundleSelect.appendChild(option);
                }
            });
            originalOptionTexts = Array.from(bundleSelect.options).map(opt => opt.text);
        } catch (error) {
            console.error("Error populating bundles:", error);
            bundleSelect.innerHTML = '<option value="">Error loading bundles</option>';
        }
    }

    // --- DYNAMIC PRICE & TEXT UPDATE LOGIC ---
    bundleSelect.addEventListener('focus', () => {
        for (let i = 0; i < bundleSelect.options.length; i++) {
            if (originalOptionTexts[i]) {
                bundleSelect.options[i].text = originalOptionTexts[i];
            }
        }
    });

    bundleSelect.addEventListener('change', () => {
        const selectedOption = bundleSelect.options[bundleSelect.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        
        if (price && parseFloat(price) > 0) {
            priceDisplay.textContent = `Price: GH₵ ${parseFloat(price).toFixed(2)}`;
            const detailsOnly = originalOptionTexts[bundleSelect.selectedIndex].split('-')[0].trim();
            setTimeout(() => {
                 selectedOption.text = detailsOnly;
            }, 10);
        } else {
            priceDisplay.textContent = 'Price: GH₵ 0.00';
        }
    });

    // --- FORM SUBMISSION LOGIC (CORRECTED) ---
    purchaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // CRITICAL FIX: The submitButton variable was not defined.
        const submitButton = purchaseForm.querySelector('button[type="submit"]');
        const selectedOption = bundleSelect.options[bundleSelect.selectedIndex];
        
        const details = selectedOption.value; // e.g., "1GB"
        const amount = selectedOption.getAttribute('data-price');
        const phoneNumber = phoneNumberInput.value;
        
        if (!amount || amount <= 0) {
            alert('Please select a valid data bundle.');
            return;
        }
        if (!/^\d{10}$/.test(phoneNumber)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        try {
             const response = await fetch('https://megalife-app-postgres.onrender.com/purchase-bundle', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                 },
                body: JSON.stringify({ type: provider, details, amount: parseFloat(amount), recipient: phoneNumber })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Success! Your purchase of ${details} was successful.`);
                window.location.href = 'BundleOrders.html';
            } else {
                alert(`Error: ${result.message}`);
            }

        } catch(error) { // The variable 'e' was incorrectly used here before.
            console.error('Purchase failed:', error);
            alert('A network error occurred. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Buy Now';
        }
    });

    // --- INITIALIZE THE PAGE ---
    fetchCurrentUserBalance();
    populateBundles();
});

*/









/*


// This script handles the logic for data bundle purchase pages.
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // --- GET ELEMENTS ---
    const purchaseForm = document.getElementById('purchase-form');
    const bundleSelect = document.getElementById('bundle-size');
    const priceDisplay = document.getElementById('price-display');
    const walletBalanceEl = document.getElementById('wallet-balance');
    const phoneNumberInput = document.getElementById('phone-number');
    
    if (!purchaseForm || !bundleSelect) return;

    const provider = purchaseForm.getAttribute('data-provider');
    let originalOptionTexts = [];

    // --- FETCH AND DISPLAY CURRENT WALLET BALANCE ---
    async function fetchCurrentUserBalance() {
        if (!walletBalanceEl) return;
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch balance');
            const user = await response.json();
            walletBalanceEl.textContent = `GH₵ ${parseFloat(user.walletBalance).toFixed(2)}`;
        } catch (error) {
            console.error(error);
            walletBalanceEl.textContent = 'Error';
        }
    }

    // --- DYNAMICALLY POPULATE BUNDLE OPTIONS ---
    async function populateBundles() {
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/bundles');
            if (!response.ok) throw new Error('Could not load bundles.');
            const allBundles = await response.json();
            const providerBundles = allBundles.filter(bundle => bundle.provider === provider);

            bundleSelect.innerHTML = '<option value="" data-price="0"> Select a Bundle </option>';

            providerBundles.forEach(bundle => {
                if (bundle.volume && bundle.price) {
                    const option = document.createElement('option');
                    option.value = bundle.volume;
                    option.setAttribute('data-price', bundle.price);
                    option.textContent = `${bundle.volume} - GHS ${parseFloat(bundle.price).toFixed(2)}`;
                    bundleSelect.appendChild(option);
                }
            });
            originalOptionTexts = Array.from(bundleSelect.options).map(opt => opt.text);
        } catch (error) {
            console.error("Error populating bundles:", error);
            bundleSelect.innerHTML = '<option value="">Error loading bundles</option>';
        }
    }

    // --- DYNAMIC PRICE & TEXT UPDATE LOGIC ---
    bundleSelect.addEventListener('focus', () => {
        for (let i = 0; i < bundleSelect.options.length; i++) {
            if (originalOptionTexts[i]) {
                bundleSelect.options[i].text = originalOptionTexts[i];
            }
        }
    });

    bundleSelect.addEventListener('change', () => {
        const selectedOption = bundleSelect.options[bundleSelect.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        
        if (price && parseFloat(price) > 0) {
            priceDisplay.textContent = `Price: GH₵ ${parseFloat(price).toFixed(2)}`;
            const detailsOnly = originalOptionTexts[bundleSelect.selectedIndex].split('-')[0].trim();
            setTimeout(() => {
                 selectedOption.text = detailsOnly;
            }, 10);
        } else {
            priceDisplay.textContent = 'Price: GH₵ 0.00';
        }
    });

    // --- FORM SUBMISSION LOGIC (CORRECTED) ---
    purchaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = purchaseForm.querySelector('button[type="submit"]');
        const selectedOption = bundleSelect.options[bundleSelect.selectedIndex];
        
        // THIS IS THE CRITICAL FIX:
        // We get the clean 'details' (e.g., "1GB") from the option's value
        // And we get the full descriptive text for the alert message.
        const details = selectedOption.value;
        const fullDetailsText = originalOptionTexts[bundleSelect.selectedIndex];
        const amount = selectedOption.getAttribute('data-price');
        const phoneNumber = phoneNumberInput.value;
        
        if (!amount || amount <= 0) {
            alert('Please select a valid data bundle.');
            return;
        }
        if (!/^\d{10}$/.test(phoneNumber)) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        try {
             const response = await fetch('https://megalife-app-postgres.onrender.com/purchase-bundle', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                 },
                // Send the clean 'details' to the backend
                body: JSON.stringify({ type: provider, details, amount: parseFloat(amount), recipient: phoneNumber })
            });

            const result = await response.json();

            if (response.ok) {
                // Use the full descriptive text in the success alert
                alert(`Success! Your purchase of ${fullDetailsText} was successful.`);
                window.location.href = 'BundleOrders.html';
            } else {
                alert(`Error: ${result.message}`);
            }

        } catch(error) {
            console.error('Purchase failed:', error);
            alert('A network error occurred. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Buy Now';
        }
    });

    // --- INITIALIZE THE PAGE ---
    fetchCurrentUserBalance();
    populateBundles();
});




*/















// This script handles the logic for data bundle purchase pages.
// This script handles the logic for data bundle purchase pages.
// Replace the existing populateBundles function with this diagnostic version
async function populateBundles() {
    console.log("--- Starting to populate bundles ---");
    try {
        console.log("Step 1: Fetching bundles from server...");
        // Use the authenticated /bundles route
        const response = await fetch('https://megalife-app-postgres.onrender.com/bundles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log("Step 2: Received response from server with status:", response.status);
        if (!response.ok) {
            throw new Error(`Could not load bundles. Server responded with ${response.status}`);
        }
        
        const allBundles = await response.json();
        console.log("Step 3: Parsed JSON data from server:", allBundles);

        if (!Array.isArray(allBundles)) {
            throw new Error("Data received from server is not a valid array.");
        }

        const providerBundles = allBundles.filter(bundle => bundle.provider === provider);
        console.log(`Step 4: Filtered for provider "${provider}". Found ${providerBundles.length} bundles.`);

        bundleSelect.innerHTML = '<option value="" data-price="0">-- Select a Bundle --</option>';

        providerBundles.forEach(bundle => {
            // Check for the correct property names from your database
            if (bundle.volume && bundle.selling_price) {
                const option = document.createElement('option');
                option.value = bundle.volume;
                option.setAttribute('data-price', bundle.selling_price); 
                option.textContent = `${bundle.volume} - GHS ${parseFloat(bundle.selling_price).toFixed(2)}`;
                bundleSelect.appendChild(option);
            } else {
                console.warn("Skipping a bundle because 'volume' or 'selling_price' is missing:", bundle);
            }
        });

        originalOptionTexts = Array.from(bundleSelect.options).map(opt => opt.text);
        console.log("✅ Step 5: Successfully populated dropdown.");

    } catch (error) {
        console.error("--- ❌ FATAL ERROR in populateBundles ---");
        console.error(error);
        bundleSelect.innerHTML = '<option value="">Error loading bundles</option>';
        bundleSelect.disabled = true;
    }
}