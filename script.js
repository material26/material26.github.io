let products = [];
let billingItems = [];
let editIndex = null;
let billingScannerActive = false;
let currentCameraIndex = 0;
let codeReader = new ZXing.BrowserBarcodeReader();
let availableCameras = [];
let orders = []; // Array to store saved orders

// Show a specific section
function showSection(section) {
    document.getElementById('inventory-section').style.display = section === 'inventory' ? 'block' : 'none';
    document.getElementById('billing-section').style.display = section === 'billing' ? 'block' : 'none';
    document.getElementById('orders-section').style.display = section === 'orders' ? 'block' : 'none';
}

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


function displayInventory() {
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';

    products.forEach((product, index) => {
        // Ensure price is defined and is a number
        const price = product.price ? product.price.toFixed(2) : '0.00';

        const li = document.createElement('li');
        li.innerHTML = `
            ${product.name} - Barcode: ${product.barcode} - Quantity: ${product.quantity} - Price: ${price}
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

function scanBarcode() {
    const scannedBarcode = document.getElementById('billing-barcode').value;

    const product = products.find(p => p.barcode === scannedBarcode);

    if (product) {
        const existingItem = billingItems.find(item => item.barcode === scannedBarcode);
        
        if (existingItem) {
            // Increment the quantity in the billing list if the item already exists
            existingItem.quantity++;
        } else {
            // Add the item to the billing list if it doesn't exist yet
            billingItems.push({ ...product, quantity: 1 });
        }

        displayBilling(); // Update the billing display
        document.getElementById('billing-barcode').value = ''; // Clear the input field
    } else {
        alert('Product not found.');
    }
}



function displayBilling() {
    const billingList = document.getElementById('billing-list');
    billingList.innerHTML = '';
    let totalPrice = 0;

    billingItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} - Quantity: <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)" /> - Price: ${item.price.toFixed(2)} - Total: ${itemTotal.toFixed(2)}
            <button onclick="removeBillingItem(${index})">Remove</button>
        `;
        billingList.appendChild(li);
    });

    document.getElementById('total-price').textContent = totalPrice.toFixed(2);
}

function removeBillingItem(index) {
    billingItems.splice(index, 1); // Remove the item from the billingItems array
    displayBilling(); // Update the billing display
}



function updateQuantity(index, newQuantity) {
    const item = billingItems[index];
    const product = products.find(p => p.barcode === item.barcode);

    if (newQuantity > 0 && newQuantity <= product.quantity + item.quantity) {
        product.quantity += item.quantity - parseInt(newQuantity); // Adjust the inventory quantity
        item.quantity = parseInt(newQuantity);
        displayBilling();
        displayInventory();
        saveInventory();
    } else {
        alert('Invalid quantity.');
    }
}


let orderNumber = 19564; // Initialize order number (you may want to use a more robust method for this)

function printBill() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;

    if (customerName && customerPhone) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString();
        const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Generate unique order number
        const uniqueOrderNumber = `ORD-${orderNumber++}`;
        
        // Header Section
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('The Stopper Shoppy', 105, 10, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text('Narayan Nagar, Latur, India', 105, 18, { align: 'center' });
        doc.text('9156540291', 105, 26, { align: 'center' });

        // Order Number and Barcode
        doc.setFontSize(12);
        
        
        // Add barcode
        const barcodeCanvas = document.createElement('canvas');
        JsBarcode(barcodeCanvas, uniqueOrderNumber, { format: "CODE39" });
        const barcodeDataURL = barcodeCanvas.toDataURL("image/png");
        doc.addImage(barcodeDataURL, 'PNG', 170, 20, 30, 10); // Adjust the position and size as needed

        // Date, Time, and Customer Details
        doc.text(`Date: ${formattedDate}`, 15, 40);
        doc.text(`Time: ${formattedTime}`, 15, 46);
        doc.text(`Customer Name: ${customerName}`, 15, 52);
        doc.text(`Customer Phone: ${customerPhone}`, 15, 58);

        // Item List Header
        let y = 70;
        doc.text('Item', 15, y);
        doc.text('Qty', 85, y);
        doc.text('Price', 120, y);
        doc.text('Total', 165, y);
        y += 6;
        doc.line(15, y, 195, y); // Horizontal line
        y += 10;

        // Item List
        billingItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            doc.text(item.name, 15, y);
            doc.text(item.quantity.toString(), 85, y, { align: 'center' });
            doc.text(item.price.toFixed(2), 120, y, { align: 'right' });
            doc.text(itemTotal.toFixed(2), 165, y, { align: 'right' });
            y += 10;
        });

        // Total Price
        y += 10;
        doc.setFont("helvetica", "bold");
        const totalPrice = billingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        doc.text('Total Price:', 120, y, { align: 'right' });
        doc.text(totalPrice.toFixed(2), 165, y, { align: 'right' });

        // Footer Section
        y += 20;
        doc.setFontSize(14);
        doc.text('Thank you for choosing us!', 105, y, { align: 'center' });
        doc.setFontSize(12);

        // Save the PDF with the customer name in the filename
        const fileName = `receipt_${uniqueOrderNumber}.pdf`;
        doc.save(fileName);
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

// Create a new Audio object for the beep sound
const beepSound = new Audio('beep.mp3');

// Start camera for scanning
function startCamera(videoElement, outputElementId) {
    billingScannerActive = true;
    videoElement.style.display = 'block';
    videoElement.width = 300; // Set video width
    videoElement.height = 150; // Set video height

    codeReader.getVideoInputDevices().then((videoInputDevices) => {
        availableCameras = videoInputDevices;
        const selectedDeviceId = availableCameras[currentCameraIndex].deviceId;
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement.id, (result, err) => {
            if (result) {
                // Play the beep sound
                beepSound.play();

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

function loadInventory() {
    const savedProducts = JSON.parse(localStorage.getItem('products')) || [];
    products = savedProducts.map(p => ({
        name: p.name || '',
        barcode: p.barcode || '',
        quantity: p.quantity || 0,
        price: typeof p.price === 'number' ? p.price : 0
    }));
    displayInventory();
}

function filterInventory() {
    const searchValue = document.getElementById('search-bar').value.toLowerCase();
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';

    const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchValue));

    filteredProducts.forEach(product => {
        const li = document.createElement('li');
        li.textContent = `${product.name} - Barcode: ${product.barcode} - Price: ₹${product.price.toFixed(2)}`;
        li.onclick = () => addItemToBilling(product);
        searchResults.appendChild(li);
    });
}

function addItemToBilling(product) {
    const existingItem = billingItems.find(item => item.barcode === product.barcode);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        billingItems.push({ ...product, quantity: 1 });
    }

    displayBilling();
    document.getElementById('search-bar').value = '';
    document.getElementById('search-results').innerHTML = '';
}

//Save the current billing list as an order
function saveOrder() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;

    if (customerName && customerPhone) {
        const order = {
            customerName,
            customerPhone,
            items: billingItems,
            orderNumber: Date.now() // Use timestamp as unique order number
        };

        orders.push(order);
        saveOrders(); // Save orders to local storage
        displayOrders(); // Update orders display
    } else {
        alert('Please enter customer name and phone number.');
    }
}

// Save order to local storage
function saveOrder() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;

    if (customerName && customerPhone) {
        const uniqueOrderNumber = `ORD-${orderNumber++}`;
        const order = {
            orderNumber: uniqueOrderNumber,
            customerName,
            customerPhone,
            items: [...billingItems]
        };

        let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];
        savedOrders.push(order);
        localStorage.setItem('savedOrders', JSON.stringify(savedOrders));

        // Reset billing items and clear form
        billingItems = [];
        displayBilling();
        clearForm();
        displaySavedOrders();
    } else {
        alert('Please enter customer name and phone number.');
    }
}

// Display saved orders
function displaySavedOrders() {
    const savedOrdersList = document.getElementById('saved-orders-list');
    savedOrdersList.innerHTML = '';

    let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];

    savedOrders.forEach(order => {
        const li = document.createElement('li');
        li.innerHTML = `
            Order Number: ${order.orderNumber} - Customer Name: ${order.customerName} - Phone: ${order.customerPhone}
            <button onclick="viewOrderDetails('${order.orderNumber}')">View Details</button>
            <button onclick="deleteOrder('${order.orderNumber}')">Delete</button>
        `;
        savedOrdersList.appendChild(li);
    });
}

// Search saved orders
function searchOrders() {
    const searchText = document.getElementById('order-search').value.toLowerCase();
    const savedOrdersList = document.getElementById('saved-orders-list');
    savedOrdersList.innerHTML = '';

    let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];

    const filteredOrders = savedOrders.filter(order =>
        order.customerName.toLowerCase().includes(searchText) ||
        order.orderNumber.toLowerCase().includes(searchText)
    );

    filteredOrders.forEach(order => {
        const li = document.createElement('li');
        li.innerHTML = `
            Order Number: ${order.orderNumber} - Customer Name: ${order.customerName} - Phone: ${order.customerPhone}
            <button onclick="viewOrderDetails('${order.orderNumber}')">View Details</button>
            <button onclick="deleteOrder('${order.orderNumber}')">Delete</button>
        `;
        savedOrdersList.appendChild(li);
    });
}

// View order details
function viewOrderDetails(orderNumber) {
    let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];
    const order = savedOrders.find(o => o.orderNumber === orderNumber);
    if (order) {
        // Display order details (you can customize this)
        alert(`Order Number: ${order.orderNumber}\nCustomer Name: ${order.customerName}\nPhone: ${order.customerPhone}\nItems: ${order.items.map(item => `${item.name} - ${item.quantity} @ ${item.price}`).join(', ')}`);
    } else {
        alert('Order not found.');
    }
}

// Delete an order
function deleteOrder(orderNumber) {
    let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];
    savedOrders = savedOrders.filter(o => o.orderNumber !== orderNumber);
    localStorage.setItem('savedOrders', JSON.stringify(savedOrders));
    displaySavedOrders();
}


// Initialize the app
loadInventory();
loadOrders();
displaySavedOrders();
