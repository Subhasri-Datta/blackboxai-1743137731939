// Complete Rental App JavaScript
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
const stripe = Stripe(process.env.STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_key');

// DOM Elements
const authLinks = document.querySelectorAll('.auth-link');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');

// Initialize App
async function initApp() {
    try {
        const isAuthenticated = await checkAuthStatus();
        updateAuthUI(isAuthenticated);
        
        if (window.location.pathname === '/') {
            await Promise.all([loadFeaturedItems(), loadCategories()]);
        } else if (window.location.pathname.startsWith('/category/')) {
            await loadCategoryItems();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

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
    if (!response.ok) throw new Error((await response.json()).message || 'Request failed');
    return response.json();
}

// Authentication Functions
async function checkAuthStatus() {
    try {
        const data = await fetchWithAuth('/auth/status');
        currentUser = data.user;
        return data.authenticated;
    } catch {
        return false;
    }
}

function updateAuthUI(isAuthenticated) {
    authLinks.forEach(link => {
        link.innerHTML = isAuthenticated ? `
            <a href="/profile">Profile</a>
            <button onclick="logout()">Logout</button>
        ` : `
            <a href="/login">Login</a>
            <a href="/register">Sign Up</a>
        `;
    });
}

// Data Loading Functions
async function loadFeaturedItems() {
    const data = await fetchWithAuth('/items?featured=true');
    renderItems(data.items, '.featured-items');
}

async function loadCategories() {
    const data = await fetchWithAuth('/items/categories');
    renderCategories(data.categories);
}

// Rental Functions
async function handleRentClick(itemId) {
    if (!currentUser) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
    }

    const item = await fetchWithAuth(`/items/${itemId}`);
    showRentalModal(item);
}

// Payment Processing
async function processPayment(rentalId) {
    const { clientSecret } = await fetchWithAuth('/payment/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ rentalId })
    });

    const { error } = await stripe.confirmCardPayment(clientSecret);
    if (error) throw error;
    
    showToast('Payment successful!', 'success');
    closeModal();
}

// Initialize
document.addEventListener('DOMContentLoaded', initApp);