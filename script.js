let products = [];
let billingItems = [];
let editIndex = null;
let billingScannerActive = false;
let currentCameraIndex = 0;
let codeReader = new ZXing.BrowserBarcodeReader();
let availableCameras = [];

// Show a specific section
function showSection(section) {
    document.getElementById('inventory-section').style.display = section === 'inventory' ? 'block' : 'none';
    document.getElementById('billing-section').style.display = section === 'billing' ? 'block' : 'none';
}

// Add or update product in the inventory
function addProduct() {
    const name = document.getElementById('product-name').value;
    const barcode = document.getElementById('product-barcode').value;
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const price = parseFloat(document.getElementById('product-price').value);

    if (name && barcode && quantity > 0 && !isNaN(price) && price >= 0) {
        const product = { name, barcode, quantity, price };

        if (editIndex !== null) {
            // Update existing product
            products[editIndex] = product;
            editIndex = null;
            document.getElementById('addProductButton').innerText = 'Add Product';
        } else {
            // Add new product
            products.push(product);
        }

        displayInventory();
        clearForm();
        saveInventory();
    } else {
        alert('Please fill in all fields correctly.');
    }
}

// Display inventory items
function displayInventory() {
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';

    products.forEach((product, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${product.name} - Barcode: ${product.barcode} - Quantity: ${product.quantity} - Price: ₹${product.price.toFixed(2)}
            <button onclick="editProduct(${index})">Edit</button>
        `;
        inventoryList.appendChild(li);
    });
}

// Clear form fields
function clearForm() {
    document.getElementById('product-name').value = '';
    document.getElementById('product-barcode').value = '';
    document.getElementById('product-quantity').value = '';
    document.getElementById('product-price').value = '';
}

// Edit a product
function editProduct(index) {
    const product = products[index];
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-barcode').value = product.barcode;
    document.getElementById('product-quantity').value = product.quantity;
    document.getElementById('product-price').value = product.price;

    editIndex = index;
    document.getElementById('addProductButton').innerText = 'Update Product';
}

// Scan barcode and update billing list
function scanBarcode() {
    const scannedBarcode = document.getElementById('billing-barcode').value;

    const product = products.find(p => p.barcode === scannedBarcode);

    if (product) {
        const existingItem = billingItems.find(item => item.barcode === scannedBarcode);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            billingItems.push({ ...product, quantity: 1 });
        }

        displayBilling();
        document.getElementById('billing-barcode').value = '';
    } else {
        alert('Product not found.');
    }
}

// Display billing items
function displayBilling() {
    const billingList = document.getElementById('billing-list');
    billingList.innerHTML = '';
    let totalPrice = 0;

    billingItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} - Quantity: <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)" /> - Price: ₹${item.price.toFixed(2)} - Total: ₹${itemTotal.toFixed(2)}
        `;
        billingList.appendChild(li);
    });

    document.getElementById('total-price').textContent = totalPrice.toFixed(2);
}

// Update quantity of a billing item
function updateQuantity(index, newQuantity) {
    if (newQuantity > 0) {
        billingItems[index].quantity = parseInt(newQuantity);
        displayBilling();
    } else {
        alert('Quantity must be at least 1.');
    }
}

// Print the bill as a PDF
function printBill() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;

    if (customerName && customerPhone) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString();
        const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Shop Name', 105, 10, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${formattedDate}`, 105, 20, { align: 'center' });
        doc.text(`Time: ${formattedTime}`, 105, 30, { align: 'center' });
        doc.text(`Customer Name: ${customerName}`, 105, 40, { align: 'center' });
        doc.text(`Customer Phone: ${customerPhone}`, 105, 50, { align: 'center' });

        let y = 60; // Start y position for the items list
        billingItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            doc.text(`${item.name} - Qty: ${item.quantity} - Price: ₹${item.price.toFixed(2)} - Total: ₹${itemTotal.toFixed(2)}`, 105, y, { align: 'center' });
            y += 10;
        });

        const totalPrice = billingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        doc.text(`Total Price: ₹${totalPrice.toFixed(2)}`, 105, y, { align: 'center' });

        y += 20;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Thank you for choosing us!', 105, y, { align: 'center' });

        doc.save('receipt.pdf');
    } else {
        alert('Please enter customer name and phone number.');
    }
}

// Function to toggle the camera scanner for billing
function toggleBillingCamera() {
    const videoElement = document.getElementById('billing-video');
    if (billingScannerActive) {
        stopCamera(videoElement);
    } else {
        startCamera(videoElement, 'billing-barcode');
    }
}

// Function to toggle the camera scanner for inventory
function toggleInventoryCamera() {
    const videoElement = document.getElementById('inventory-video');
    if (billingScannerActive) {
        stopCamera(videoElement);
    } else {
        startCamera(videoElement, 'product-barcode');
    }
}

// Start camera for scanning
function startCamera(videoElement, outputElementId) {
    billingScannerActive = true;
    videoElement.style.display = 'block';

    codeReader.getVideoInputDevices().then((videoInputDevices) => {
        availableCameras = videoInputDevices;
        const selectedDeviceId = availableCameras[currentCameraIndex].deviceId;
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement.id, (result, err) => {
            if (result) {
                document.getElementById(outputElementId).value = result.text;
                if (outputElementId === 'billing-barcode') {
                    scanBarcode();
                }
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
            }
        });
    }).catch(err => console.error(err));
}

// Stop camera
function stopCamera(videoElement) {
    videoElement.style.display = 'none';
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    billingScannerActive = false;
}

// Switch to the next available camera
function switchCamera() {
    if (availableCameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        const videoElement = billingScannerActive ? document.getElementById('billing-video') : document.getElementById('inventory-video');
        stopCamera(videoElement);
        startCamera(videoElement, billingScannerActive ? 'billing-barcode' : 'product-barcode');
    } else {
        alert('No additional cameras available.');
    }
}

// Save products to local storage
function saveInventory() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Load products from local storage
function loadInventory() {
    const savedProducts = JSON.parse(localStorage.getItem('products')) || [];
    products = savedProducts;
    displayInventory();
}

// Initialize the app
loadInventory();

