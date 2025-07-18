// Inizializzazione Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Stato dell'applicazione
let currentUser = null;
let currentBeers = [];
let currentBeerToDelete = null;
let currentFilterType = 'all';
let isEditMode = false;
let editingBeerId = null;
let ratings = {
    rating_overall: 0,
    edit_rating_overall: 0
};

// Elementi DOM
const elements = {
    loading: document.getElementById('loading'),
    authPage: document.getElementById('authPage'),
    mainApp: document.getElementById('mainApp'),
    header: document.getElementById('header'),
    
    // Auth forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginFormElement: document.getElementById('loginFormElement'),
    registerFormElement: document.getElementById('registerFormElement'),
    showRegister: document.getElementById('showRegister'),
    showLogin: document.getElementById('showLogin'),
    
    // Navigation
    dashboardBtn: document.getElementById('dashboardBtn'),
    addBeerBtn: document.getElementById('addBeerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Pages
    dashboardPage: document.getElementById('dashboardPage'),
    addBeerPage: document.getElementById('addBeerPage'),
    editBeerPage: document.getElementById('editBeerPage'),
    filteredBeersPage: document.getElementById('filteredBeersPage'),
    beerDetailPage: document.getElementById('beerDetailPage'),
    
    // Dashboard elements
    totalBeers: document.getElementById('totalBeers'),
    avgRating: document.getElementById('avgRating'),
    favoriteStyle: document.getElementById('favoriteStyle'),
    favoriteBrewery: document.getElementById('favoriteBrewery'),
    
    // Filtered page elements
    filteredBeersList: document.getElementById('filteredBeersList'),
    filteredStyleFilter: document.getElementById('filteredStyleFilter'),
    filteredSortBy: document.getElementById('filteredSortBy'),
    filteredPageTitle: document.getElementById('filteredPageTitle'),
    filteredSectionTitle: document.getElementById('filteredSectionTitle'),
    
    // Add beer form
    addBeerForm: document.getElementById('addBeerForm'),
    cancelAddBeer: document.getElementById('cancelAddBeer'),
    
    // Edit beer form
    editBeerForm: document.getElementById('editBeerForm'),
    cancelEditBeer: document.getElementById('cancelEditBeer'),
    
    // Modal and toast
    deleteModal: document.getElementById('deleteModal'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete'),
    toast: document.getElementById('toast')
};

// Inizializzazione app
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventListeners();
    setupStarRatings();
});

// Inizializzazione dell'applicazione
async function initApp() {
    try {
        // Controlla se l'utente è già loggato
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            currentUser = session.user;
            await loadUserProfile();
            showMainApp();
        } else {
            showAuthPage();
        }
    } catch (error) {
        console.error('Errore inizializzazione:', error);
        showToast('Errore di connessione', 'error');
        showAuthPage();
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth event listeners
    elements.showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    elements.loginFormElement.addEventListener('submit', handleLogin);
    elements.registerFormElement.addEventListener('submit', handleRegister);
    
    // Navigation event listeners
    elements.dashboardBtn.addEventListener('click', () => showPage('dashboard'));
    elements.addBeerBtn.addEventListener('click', () => showPage('addBeer'));
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Form event listeners
    elements.addBeerForm.addEventListener('submit', handleAddBeer);
    elements.cancelAddBeer.addEventListener('click', () => showPage('dashboard'));
    
    elements.editBeerForm.addEventListener('submit', handleEditBeer);
    elements.cancelEditBeer.addEventListener('click', () => showPage('dashboard'));
    
    // Filter event listeners for filtered page
    elements.filteredStyleFilter.addEventListener('change', filterAndSortFilteredBeers);
    elements.filteredSortBy.addEventListener('change', filterAndSortFilteredBeers);
    
    // Modal event listeners
    elements.cancelDelete.addEventListener('click', hideDeleteModal);
    elements.confirmDelete.addEventListener('click', handleDeleteBeer);
    
    // Auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuthPage();
        }
    });
    
    // Data oggi per il form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('beerDate').value = today;
}

// Setup sistema valutazioni a stelle
function setupStarRatings() {
    document.querySelectorAll('.star-rating').forEach(rating => {
        const stars = rating.querySelectorAll('i');
        const ratingType = rating.dataset.rating;
        
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                const value = index + 1;
                ratings[ratingType] = value;
                
                // Aggiorna visualizzazione stelle
                stars.forEach((s, i) => {
                    if (i < value) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
            
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.style.color = 'var(--gold)';
                    } else {
                        s.style.color = 'var(--gray-medium)';
                    }
                });
            });
        });
        
        rating.addEventListener('mouseleave', () => {
            const currentRating = ratings[ratingType];
            stars.forEach((s, i) => {
                if (i < currentRating) {
                    s.style.color = 'var(--gold)';
                } else {
                    s.style.color = 'var(--gray-medium)';
                }
            });
        });
    });
}

// Gestione autenticazione
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await loadUserProfile();
        showMainApp();
        showToast('Login effettuato con successo!', 'success');
        
    } catch (error) {
        console.error('Errore login:', error);
        showToast(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('registerFullName').value;
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    username: username
                }
            }
        });
        
        if (error) throw error;
        
        // Crea il profilo utente
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        username: username,
                        full_name: fullName
                    }
                ]);
            
            if (profileError) throw profileError;
        }
        
        showToast('Registrazione completata! Controlla la tua email per confermare l\'account.', 'success');
        showLoginForm();
        
    } catch (error) {
        console.error('Errore registrazione:', error);
        showToast(error.message, 'error');
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        currentBeers = [];
        showAuthPage();
        showToast('Logout effettuato con successo!', 'success');
        
    } catch (error) {
        console.error('Errore logout:', error);
        showToast('Errore durante il logout', 'error');
    }
}

// Caricamento profilo utente
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        // Non mostriamo più il nome utente nella home
        // La home è ora più pulita senza il messaggio di benvenuto
        
    } catch (error) {
        console.error('Errore caricamento profilo:', error);
    }
}

// Gestione birre
async function handleAddBeer(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('beerName').value,
        brewery: document.getElementById('beerBrewery').value,
        style: document.getElementById('beerStyle').value,
        alcohol_percentage: parseFloat(document.getElementById('beerAlcohol').value) || null,
        consumption_date: document.getElementById('beerDate').value || null,
        location: document.getElementById('beerLocation').value || null,
        notes: document.getElementById('beerNotes').value || null,
        rating_overall: ratings.rating_overall || null,
        user_id: currentUser.id
    };
    
    try {
        const { data, error } = await supabase
            .from('beers')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        showToast('Birra aggiunta con successo!', 'success');
        resetAddBeerForm();
        showPage('dashboard');
        await loadBeers();
        
    } catch (error) {
        console.error('Errore aggiunta birra:', error);
        showToast('Errore durante l\'aggiunta della birra', 'error');
    }
}

// Gestione modifica birra
async function editBeer(beerId) {
    const beer = currentBeers.find(b => b.id === beerId);
    if (!beer) return;
    
    isEditMode = true;
    editingBeerId = beerId;
    
    // Popola il form di modifica
    document.getElementById('editBeerId').value = beer.id;
    document.getElementById('editBeerName').value = beer.name || '';
    document.getElementById('editBeerBrewery').value = beer.brewery || '';
    document.getElementById('editBeerStyle').value = beer.style || '';
    document.getElementById('editBeerAlcohol').value = beer.alcohol_percentage || '';
    document.getElementById('editBeerDate').value = beer.consumption_date || '';
    document.getElementById('editBeerLocation').value = beer.location || '';
    document.getElementById('editBeerNotes').value = beer.notes || '';
    
    // Imposta la valutazione
    ratings.edit_rating_overall = beer.rating_overall || 0;
    updateStarDisplay('edit_rating_overall', ratings.edit_rating_overall);
    
    showPage('editBeer');
}

async function handleEditBeer(e) {
    e.preventDefault();
    
    if (!editingBeerId) return;
    
    const formData = {
        name: document.getElementById('editBeerName').value,
        brewery: document.getElementById('editBeerBrewery').value,
        style: document.getElementById('editBeerStyle').value,
        alcohol_percentage: parseFloat(document.getElementById('editBeerAlcohol').value) || null,
        consumption_date: document.getElementById('editBeerDate').value || null,
        location: document.getElementById('editBeerLocation').value || null,
        notes: document.getElementById('editBeerNotes').value || null,
        rating_overall: ratings.edit_rating_overall || null
    };
    
    try {
        const { data, error } = await supabase
            .from('beers')
            .update(formData)
            .eq('id', editingBeerId)
            .select();
        
        if (error) throw error;
        
        showToast('Birra modificata con successo!', 'success');
        resetEditMode();
        showPage('dashboard');
        await loadBeers();
        
    } catch (error) {
        console.error('Errore modifica birra:', error);
        showToast('Errore durante la modifica della birra', 'error');
    }
}

function resetEditMode() {
    isEditMode = false;
    editingBeerId = null;
    ratings.edit_rating_overall = 0;
    
    // Reset del form
    document.getElementById('editBeerForm').reset();
    
    // Reset stelle
    document.querySelectorAll('[data-rating="edit_rating_overall"] i').forEach(star => {
        star.classList.remove('active');
        star.style.color = 'var(--gray-medium)';
    });
}
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('beers')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentBeers = data || [];
        updateStatistics();
        filterAndSortBeers();
        
    } catch (error) {
        console.error('Errore caricamento birre:', error);
        showToast('Errore durante il caricamento delle birre', 'error');
        currentBeers = [];
        updateStatistics();
        renderBeers([]);
    }
}

function filterAndSortBeers() {
    let filteredBeers = [...currentBeers];
    
    // Filtro per stile
    const styleFilter = elements.styleFilter.value;
    if (styleFilter) {
        filteredBeers = filteredBeers.filter(beer => beer.style === styleFilter);
    }
    
    // Ordinamento
    const sortBy = elements.sortBy.value;
    filteredBeers.sort((a, b) => {
        switch (sortBy) {
            case 'created_at':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'consumption_date':
                if (!a.consumption_date && !b.consumption_date) return 0;
                if (!a.consumption_date) return 1;
                if (!b.consumption_date) return -1;
                return new Date(b.consumption_date) - new Date(a.consumption_date);
            case 'rating_overall':
                return (b.rating_overall || 0) - (a.rating_overall || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    renderBeers(filteredBeers);
}

function renderBeers(beers) {
    if (beers.length === 0) {
        elements.beersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-beer"></i>
                <h3>Nessuna birra trovata</h3>
                <p>Inizia ad aggiungere le tue birre preferite!</p>
                <button class="btn btn-primary" onclick="showPage('addBeer')">
                    <i class="fas fa-plus"></i>
                    Aggiungi la prima birra
                </button>
            </div>
        `;
        return;
    }
    
    elements.beersList.innerHTML = beers.map(beer => `
        <div class="beer-card" onclick="showBeerDetail('${beer.id}')">
            <div class="beer-card-header">
                <div class="beer-card-info">
                    <h4>${beer.name}</h4>
                    <p>${beer.brewery}</p>
                </div>
                <div class="beer-card-rating">
                    <div class="stars">
                        ${generateStars(beer.rating_overall || 0)}
                    </div>
                    <span class="rating-value">${(beer.rating_overall || 0).toFixed(1)}</span>
                </div>
            </div>
            <div class="beer-card-details">
                <span class="beer-card-style">${beer.style}</span>
                <span class="beer-card-date">
                    ${beer.consumption_date ? formatDate(beer.consumption_date) : 'Data non specificata'}
                </span>
            </div>
        </div>
    `).join('');
}

function updateStatistics() {
    const totalBeers = currentBeers.length;
    const avgRating = totalBeers > 0 
        ? currentBeers.reduce((sum, beer) => sum + (beer.rating_overall || 0), 0) / totalBeers 
        : 0;
    
    const styleCount = {};
    const breweryCount = {};
    
    currentBeers.forEach(beer => {
        if (beer.style) {
            styleCount[beer.style] = (styleCount[beer.style] || 0) + 1;
        }
        if (beer.brewery) {
            breweryCount[beer.brewery] = (breweryCount[beer.brewery] || 0) + 1;
        }
    });
    
    const favoriteStyle = Object.keys(styleCount).length > 0 
        ? Object.keys(styleCount).reduce((a, b) => styleCount[a] > styleCount[b] ? a : b)
        : '-';
        
    const favoriteBrewery = Object.keys(breweryCount).length > 0 
        ? Object.keys(breweryCount).reduce((a, b) => breweryCount[a] > breweryCount[b] ? a : b)
        : '-';
    
    elements.totalBeers.textContent = totalBeers;
    elements.avgRating.textContent = avgRating.toFixed(1);
    elements.favoriteStyle.textContent = favoriteStyle;
    elements.favoriteBrewery.textContent = favoriteBrewery;
}

async function showBeerDetail(beerId) {
    const beer = currentBeers.find(b => b.id === beerId);
    if (!beer) return;
    
    const detailContent = `
        <div class="beer-detail-header">
            <div class="beer-detail-info">
                <h1>${beer.name}</h1>
                <p><strong>Birrificio:</strong> ${beer.brewery}</p>
                <p><strong>Stile:</strong> ${beer.style}</p>
                ${beer.alcohol_percentage ? `<p><strong>Gradazione:</strong> ${beer.alcohol_percentage}%</p>` : ''}
            </div>
            <div class="beer-detail-actions">
                <button class="btn btn-secondary" onclick="showPage('dashboard')">
                    <i class="fas fa-arrow-left"></i>
                    Indietro
                </button>
                <button class="btn btn-danger" onclick="showDeleteModal('${beer.id}')">
                    <i class="fas fa-trash"></i>
                    Elimina
                </button>
            </div>
        </div>
        
        <div class="beer-detail-content">
            <div class="detail-section">
                <h3>Informazioni</h3>
                <div class="detail-grid">
                    ${beer.consumption_date ? `
                        <div class="detail-item">
                            <span class="detail-label">Data consumo:</span>
                            <span class="detail-value">${formatDate(beer.consumption_date)}</span>
                        </div>
                    ` : ''}
                    ${beer.location ? `
                        <div class="detail-item">
                            <span class="detail-label">Luogo:</span>
                            <span class="detail-value">${beer.location}</span>
                        </div>
                    ` : ''}
                    ${beer.price ? `
                        <div class="detail-item">
                            <span class="detail-label">Prezzo:</span>
                            <span class="detail-value">€${beer.price.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Valutazioni</h3>
                <div class="detail-grid">
                    ${beer.rating_appearance ? `
                        <div class="detail-item">
                            <span class="detail-label">Aspetto:</span>
                            <div class="rating-display">
                                <span class="stars">${generateStars(beer.rating_appearance)}</span>
                                <span class="rating-text">${beer.rating_appearance}/5</span>
                            </div>
                        </div>
                    ` : ''}
                    ${beer.rating_aroma ? `
                        <div class="detail-item">
                            <span class="detail-label">Aroma:</span>
                            <div class="rating-display">
                                <span class="stars">${generateStars(beer.rating_aroma)}</span>
                                <span class="rating-text">${beer.rating_aroma}/5</span>
                            </div>
                        </div>
                    ` : ''}
                    ${beer.rating_taste ? `
                        <div class="detail-item">
                            <span class="detail-label">Sapore:</span>
                            <div class="rating-display">
                                <span class="stars">${generateStars(beer.rating_taste)}</span>
                                <span class="rating-text">${beer.rating_taste}/5</span>
                            </div>
                        </div>
                    ` : ''}
                    ${beer.rating_drinkability ? `
                        <div class="detail-item">
                            <span class="detail-label">Bevibilità:</span>
                            <div class="rating-display">
                                <span class="stars">${generateStars(beer.rating_drinkability)}</span>
                                <span class="rating-text">${beer.rating_drinkability}/5</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <span class="detail-label"><strong>Voto Complessivo:</strong></span>
                        <div class="rating-display">
                            <span class="stars">${generateStars(beer.rating_overall || 0)}</span>
                            <span class="rating-text"><strong>${(beer.rating_overall || 0).toFixed(1)}/5</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        ${beer.notes ? `
            <div class="notes-section">
                <h4>Note</h4>
                <div class="notes-content">${beer.notes}</div>
            </div>
        ` : ''}
    `;
    
    elements.beerDetailPage.querySelector('.beer-detail').innerHTML = detailContent;
    showPage('beerDetail');
}

// Eliminazione birra
function showDeleteModal(beerId) {
    currentBeerToDelete = beerId;
    elements.deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    currentBeerToDelete = null;
    elements.deleteModal.classList.add('hidden');
}

async function handleDeleteBeer() {
    if (!currentBeerToDelete) return;
    
    try {
        const { error } = await supabase
            .from('beers')
            .delete()
            .eq('id', currentBeerToDelete);
        
        if (error) throw error;
        
        showToast('Birra eliminata con successo!', 'success');
        hideDeleteModal();
        showPage('dashboard');
        await loadBeers();
        
    } catch (error) {
        console.error('Errore eliminazione birra:', error);
        showToast('Errore durante l\'eliminazione della birra', 'error');
    }
}

// Utility functions
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function resetAddBeerForm() {
    elements.addBeerForm.reset();
    
    // Reset ratings
    ratings.rating_overall = 0;
    
    // Reset star display
    document.querySelectorAll('[data-rating="rating_overall"] i').forEach(star => {
        star.classList.remove('active');
        star.style.color = 'var(--gray-medium)';
    });
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('beerDate').value = today;
}

// Funzione helper per aggiornare la visualizzazione delle stelle
function updateStarDisplay(ratingType, value) {
    const stars = document.querySelectorAll(`[data-rating="${ratingType}"] i`);
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
            star.style.color = 'var(--gold)';
        } else {
            star.classList.remove('active');
            star.style.color = 'var(--gray-medium)';
        }
    });
}

// UI Management
function showPage(pageName) {
    // Hide all pages
    elements.dashboardPage.classList.add('hidden');
    elements.addBeerPage.classList.add('hidden');
    elements.editBeerPage.classList.add('hidden');
    elements.filteredBeersPage.classList.add('hidden');
    elements.beerDetailPage.classList.add('hidden');
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected page and activate nav button
    switch (pageName) {
        case 'dashboard':
            elements.dashboardPage.classList.remove('hidden');
            elements.dashboardBtn.classList.add('active');
            loadBeers();
            break;
        case 'addBeer':
            elements.addBeerPage.classList.remove('hidden');
            elements.addBeerBtn.classList.add('active');
            resetAddBeerForm();
            break;
        case 'editBeer':
            elements.editBeerPage.classList.remove('hidden');
            break;
        case 'filteredBeers':
            elements.filteredBeersPage.classList.remove('hidden');
            break;
        case 'beerDetail':
            elements.beerDetailPage.classList.remove('hidden');
            break;
    }
}

function showAuthPage() {
    elements.loading.classList.add('hidden');
    elements.authPage.classList.remove('hidden');
    elements.mainApp.classList.add('hidden');
    elements.header.classList.add('hidden');
}

function showMainApp() {
    elements.loading.classList.add('hidden');
    elements.authPage.classList.add('hidden');
    elements.mainApp.classList.remove('hidden');
    elements.header.classList.remove('hidden');
    showPage('dashboard');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showLoginForm() {
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');
    clearAuthForms();
}

function showRegisterForm() {
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.remove('hidden');
    clearAuthForms();
}

function clearAuthForms() {
    elements.loginFormElement.reset();
    elements.registerFormElement.reset();
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = elements.toast;
    const icon = toast.querySelector('.toast-icon');
    const messageElement = toast.querySelector('.toast-message');
    
    // Set message
    messageElement.textContent = message;
    
    // Set icon and class based on type
    toast.className = `toast ${type}`;
    
    switch (type) {
        case 'success':
            icon.className = 'toast-icon fas fa-check-circle';
            break;
        case 'error':
            icon.className = 'toast-icon fas fa-exclamation-circle';
            break;
        case 'warning':
            icon.className = 'toast-icon fas fa-exclamation-triangle';
            break;
        default:
            icon.className = 'toast-icon fas fa-info-circle';
    }
    
    // Show toast
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 4000);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Errore JavaScript:', event.error);
    showToast('Si è verificato un errore inaspettato', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejected:', event.reason);
    showToast('Errore di connessione', 'error');
});

// Service worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for global access
window.showPage = showPage;
window.showBeerDetail = showBeerDetail;
window.showDeleteModal = showDeleteModal;
window.hideDeleteModal = hideDeleteModal;
window.showFilteredBeers = showFilteredBeers;
window.editBeer = editBeer;