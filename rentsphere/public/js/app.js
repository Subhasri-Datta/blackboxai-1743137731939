// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;

// DOM Elements
const searchInput = document.querySelector('input[type="text"]');
const searchButton = document.querySelector('.fa-search')?.parentElement;
const rentButtons = document.querySelectorAll('.bg-blue-600');
const authLinks = document.querySelectorAll('.auth-link');

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_key');

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication status
        const authStatus = await checkAuthStatus();
        updateAuthUI(authStatus);
        
        // Load featured items
        await loadFeaturedItems();
        
        // Load categories if on homepage
        if (window.location.pathname === '/') {
            await loadCategories();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// API Functions
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
    }
    return response.json();
}

async function checkAuthStatus() {
    try {
        const data = await fetchWithAuth('/auth/status');
        currentUser = data.user;
        return data.authenticated;
    } catch {
        return false;
    }
}

async function loadFeaturedItems() {
    const data = await fetchWithAuth('/items?featured=true&limit=6');
    renderItems(data.items, '.featured-items-container');
}

async function loadCategories() {
    const data = await fetchWithAuth('/items/categories');
    renderCategories(data.categories);
}

// Functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            updateAuthUI(data.authenticated);
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

function updateAuthUI(isAuthenticated) {
    const authSection = document.querySelector('.auth-section');
    if (isAuthenticated) {
        authSection.innerHTML = `
            <a href="/profile" class="mr-4">My Profile</a>
            <button onclick="logout()" class="bg-blue-600 text-white px-4 py-2 rounded">Logout</button>
        `;
    }
}

async function loadFeaturedItems() {
    try {
        const response = await fetch('/api/items?featured=true');
        if (response.ok) {
            const items = await response.json();
            renderFeaturedItems(items);
        }
    } catch (error) {
        console.error('Error loading featured items:', error);
    }
}

function renderFeaturedItems(items) {
    const container = document.querySelector('.featured-items-container');
    container.innerHTML = items.map(item => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <img src="${item.images[0] || 'https://via.placeholder.com/300'}" 
                 alt="${item.name}" class="w-full h-48 object-cover">
            <div class="p-6">
                <h3 class="font-bold text-xl mb-2">${item.name}</h3>
                <p class="text-gray-600 mb-4">${item.description.substring(0, 50)}...</p>
                <div class="flex justify-between items-center">
                    <span class="font-bold text-lg">$${item.pricePerDay}/day</span>
                    <button class="rent-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" 
                            data-id="${item._id}">
                        Rent Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to new rent buttons
    document.querySelectorAll('.rent-btn').forEach(btn => {
        btn.addEventListener('click', handleRentClick);
    });
}

async function handleRentClick(e) {
    const itemId = e.target.dataset.id;
    
    try {
        // Check if user is logged in
        const authResponse = await fetch('/api/auth/status');
        if (!authResponse.ok || !(await authResponse.json()).authenticated) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        // Get item details
        const itemResponse = await fetch(`/api/items/${itemId}`);
        if (!itemResponse.ok) throw new Error('Item not found');
        const item = await itemResponse.json();

        // Show rental modal
        showRentalModal(item);
    } catch (error) {
        console.error('Error handling rent click:', error);
        alert('Error: ' + error.message);
    }
}

function showRentalModal(item) {
    // Create modal HTML
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">Rent ${item.name}</h3>
                <div class="mb-4">
                    <label class="block mb-2">Rental Dates</label>
                    <div class="flex space-x-2">
                        <input type="date" id="startDate" class="border p-2 rounded w-1/2">
                        <input type="date" id="endDate" class="border p-2 rounded w-1/2">
                    </div>
                </div>
                <div class="mb-4">
                    <p>Total Price: <span id="totalPrice">$${item.pricePerDay}</span></p>
                </div>
                <div class="flex justify-end space-x-2">
                    <button onclick="closeModal()" class="px-4 py-2 border rounded">Cancel</button>
                    <button onclick="confirmRental('${item._id}')" class="bg-blue-600 text-white px-4 py-2 rounded">
                        Confirm Rental
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function confirmRental(itemId) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select rental dates');
        return;
    }

    try {
        // Create rental
        const response = await fetch('/api/rentals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ itemId, startDate, endDate })
        });

        if (!response.ok) throw new Error('Failed to create rental');
        const rental = await response.json();

        // Process payment
        await processPayment(rental._id);
    } catch (error) {
        console.error('Error confirming rental:', error);
        alert('Error: ' + error.message);
    }
}

async function processPayment(rentalId) {
    try {
        // Create payment intent
        const response = await fetch('/api/payment/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rentalId })
        });

        if (!response.ok) throw new Error('Payment failed');
        const { clientSecret } = await response.json();

        // Confirm payment with Stripe
        const { error } = await stripe.confirmCardPayment(clientSecret);
        if (error) throw error;

        // Payment successful
        alert('Payment successful! Your rental is confirmed.');
        window.location.href = '/rentals';
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
    }
}

function closeModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        localStorage.removeItem('token');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}