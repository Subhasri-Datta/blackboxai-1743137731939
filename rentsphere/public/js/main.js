// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;

// DOM Elements
const searchInput = document.querySelector('input[type="text"]');
const searchButton = document.querySelector('.fa-search')?.parentElement;
const rentButtons = document.querySelectorAll('.rent-btn');
const authLinks = document.querySelectorAll('.auth-link');

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_key');

// Main initialization
async function initApp() {
    try {
        // Check authentication status
        const isAuthenticated = await checkAuthStatus();
        updateAuthUI(isAuthenticated);
        
        // Load content based on current page
        if (window.location.pathname === '/') {
            await Promise.all([
                loadFeaturedItems(),
                loadCategories()
            ]);
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

// Data Loading Functions
async function loadFeaturedItems() {
    const data = await fetchWithAuth('/items?featured=true&limit=6');
    renderItems(data.items, '.featured-items-container');
}

async function loadCategories() {
    const data = await fetchWithAuth('/items/categories');
    renderCategories(data.categories);
}

// UI Functions
function updateAuthUI(isAuthenticated) {
    authLinks.forEach(link => {
        link.innerHTML = isAuthenticated ? `
            <a href="/profile" class="mr-4">My Profile</a>
            <button onclick="logout()" class="btn-primary">Logout</button>
        ` : `
            <a href="/login" class="mr-4">Login</a>
            <a href="/register" class="btn-primary">Sign Up</a>
        `;
    });
}

function renderItems(items, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div class="item-card">
            <img src="${item.images?.[0] || 'https://via.placeholder.com/300'}" 
                 alt="${item.name}">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p>${item.description.substring(0, 60)}...</p>
                <div class="item-footer">
                    <span>$${item.pricePerDay}/day</span>
                    <button class="rent-btn" data-id="${item._id}">
                        Rent Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.rent-btn').forEach(btn => {
        btn.addEventListener('click', handleRentClick);
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);