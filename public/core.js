// admin_init.js - Initialisation et configuration principale

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC2cyWkf-8L8251t8j4ExGmHv3se-K0Vh4",
    authDomain: "elcoif.firebaseapp.com",
    projectId: "elcoif",
    storageBucket: "elcoif.firebasestorage.app",
    messagingSenderId: "44236993001",
    appId: "1:44236993001:web:373ab3e43ed5025a65db78",
    measurementId: "G-Q1QS6Y5SCY"
};

// Variables globales principales
let db = null;
let firebaseEnabled = false;
let appointments = [];
let services = [];
let schedules = [];
let messages = [];
let currentFilter = 'all';
let currentConversation = null;
let appointmentsListener = null;
let messagesListener = null;
let servicesListener = null;
let schedulesListener = null;
let priceUpdateHistory = [];
let isUpdatingPrices = false;
let priceValidationRules = {
    minPrice: 5,
    maxPrice: 500,
    defaultDuration: 30
};
let ADMIN_PASSWORD = localStorage.getItem('adminPassword') || 'admin123';

// Initialisation principale
async function initializeAdmin() {
    try {
        console.log('🔐 Vérification du mot de passe...');
        showPasswordModal();
        
        console.log('🔄 Initialisation de Firebase...');
        await initializeFirebase();
        
        console.log('📂 Chargement des données...');
        await loadAllData();
        
        console.log('🎛️ Configuration des événements...');
        setupEventListeners();
        
        console.log('💰 Initialisation du gestionnaire de prix...');
        initializePriceManager();
        
        console.log('📊 Affichage par défaut...');
        showAllAppointments();
        
        console.log('✅ Administration initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement de l\'administration.', 'error');
    }
}

// Authentification
function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.style.display = 'flex';
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
}

function verifyPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const errorMessage = document.getElementById('passwordError');
    
    if (!passwordInput) {
        console.error('❌ Input mot de passe non trouvé');
        return;
    }
    
    if (passwordInput.value === ADMIN_PASSWORD) {
        document.getElementById('passwordModal').style.display = 'none';
        showNotification('🎉 Connexion réussie !', 'success');
        console.log('✅ Authentification réussie');
    } else {
        if (errorMessage) {
            errorMessage.style.display = 'block';
        }
        passwordInput.value = '';
        setTimeout(() => {
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        }, 3000);
        console.log('❌ Mot de passe incorrect');
    }
}

// Firebase
async function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase non chargé, mode hors ligne activé');
            firebaseEnabled = false;
            updateFirebaseStatus(false, 'Hors ligne');
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        
        const testPromise = db.collection('services').limit(1).get();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        await Promise.race([testPromise, timeoutPromise])
            .then(() => {
                firebaseEnabled = true;
                updateFirebaseStatus(true, 'Firebase connecté');
                console.log('✅ Firebase connecté');
            })
            .catch(error => {
                console.warn('⚠️ Firebase non disponible:', error.message);
                firebaseEnabled = false;
                updateFirebaseStatus(false, 'Mode hors ligne');
            });
    } catch (error) {
        console.warn('⚠️ Erreur Firebase:', error);
        firebaseEnabled = false;
        updateFirebaseStatus(false, 'Erreur de configuration');
    }
}

function updateFirebaseStatus(isOnline, statusText) {
    try {
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');
        if (indicator && text) {
            indicator.className = `status-indicator ${isOnline ? 'status-online' : 'status-offline'}`;
            text.textContent = statusText;
        }
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
    }
}

// Chargement des données
async function loadAllData() {
    try {
        await Promise.all([
            loadServices(),
            loadAppointments(),
            loadSchedules(),
            loadMessages()
        ]);
        updateStatistics();
        console.log('✅ Toutes les données chargées');
    } catch (error) {
        console.error('❌ Erreur chargement données:', error);
    }
}

async function loadServices() {
    try {
        if (servicesListener) servicesListener();
        
        if (firebaseEnabled && db) {
            servicesListener = db.collection('services').onSnapshot(snapshot => {
                if (snapshot.empty) {
                    console.log('📦 Initialisation des services par défaut...');
                    initializeDefaultServices();
                } else {
                    const newServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    if (services.length > 0) {
                        const pricesChanged = detectPriceChanges(services, newServices);
                        if (pricesChanged) {
                            console.log('💰 Prix mis à jour détectés');
                            showNotification('Prix des services mis à jour !', 'info');
                        }
                    }
                    
                    services = newServices;
                    console.log(`✅ ${services.length} services chargés`);
                    refreshPriceManagerIfOpen();
                }
            }, error => {
                console.error('Erreur services Firebase:', error);
                loadLocalServices();
            });
        } else {
            loadLocalServices();
        }
    } catch (error) {
        console.error('Erreur chargement services:', error);
        loadLocalServices();
    }
}

function loadLocalServices() {
    try {
        services = JSON.parse(localStorage.getItem('services') || '[]');
        if (!services.length) {
            services = getDefaultServices();
            localStorage.setItem('services', JSON.stringify(services));
        }
        console.log(`✅ ${services.length} services locaux chargés`);
    } catch (error) {
        console.error('Erreur services locaux:', error);
        services = getDefaultServices();
    }
}

function getDefaultServices() {
    return [
        { id: 'coupe-homme', name: 'Coupe Homme', price: 25, duration: 30 },
        { id: 'coupe-femme', name: 'Coupe Femme', price: 45, duration: 45 },
        { id: 'coloration', name: 'Coloration', price: 60, duration: 90 },
        { id: 'balayage', name: 'Balayage', price: 80, duration: 120 },
        { id: 'brushing', name: 'Brushing', price: 20, duration: 30 },
        { id: 'soin', name: 'Soin Capillaire', price: 30, duration: 45 }
    ];
}

async function initializeDefaultServices() {
    const defaultServices = getDefaultServices();
    
    try {
        if (firebaseEnabled && db) {
            const batch = db.batch();
            defaultServices.forEach(service => {
                const serviceRef = db.collection('services').doc(service.id);
                batch.set(serviceRef, service);
            });
            await batch.commit();
            console.log('✅ Services initialisés dans Firebase');
        } else {
            localStorage.setItem('services', JSON.stringify(defaultServices));
            services = defaultServices;
            console.log('✅ Services initialisés localement');
        }
    } catch (error) {
        console.error('Erreur initialisation services:', error);
        services = defaultServices;
    }
}

function detectPriceChanges(oldServices, newServices) {
    if (!oldServices || oldServices.length === 0) return false;
    
    for (let newService of newServices) {
        const oldService = oldServices.find(s => s.id === newService.id);
        if (oldService && (oldService.price !== newService.price || oldService.duration !== newService.duration)) {
            console.log(`🔄 ${newService.name}: ${oldService.price} → ${newService.price} DHS`);
            return true;
        }
    }
    return false;
}

async function loadAppointments() {
    try {
        if (appointmentsListener) appointmentsListener();
        
        if (firebaseEnabled && db) {
            appointmentsListener = db.collection('appointments')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    displayAppointments();
                    updateStatistics();
                    console.log(`✅ ${appointments.length} rendez-vous chargés`);
                }, error => {
                    console.error('Erreur appointments Firebase:', error);
                    loadLocalAppointments();
                });
        } else {
            loadLocalAppointments();
        }
    } catch (error) {
        console.error('Erreur chargement appointments:', error);
        loadLocalAppointments();
    }
}

function loadLocalAppointments() {
    try {
        appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        displayAppointments();
        updateStatistics();
        console.log(`✅ ${appointments.length} rendez-vous locaux`);
    } catch (error) {
        console.error('Erreur appointments locaux:', error);
        appointments = [];
    }
}

async function loadSchedules() {
    try {
        if (schedulesListener) schedulesListener();
        
        if (firebaseEnabled && db) {
            schedulesListener = db.collection('schedules').onSnapshot(snapshot => {
                schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`✅ ${schedules.length} plannings chargés`);
            }, error => {
                console.error('Erreur schedules Firebase:', error);
                loadLocalSchedules();
            });
        } else {
            loadLocalSchedules();
        }
    } catch (error) {
        console.error('Erreur chargement schedules:', error);
        loadLocalSchedules();
    }
}

function loadLocalSchedules() {
    try {
        schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
        console.log(`✅ ${schedules.length} plannings locaux`);
    } catch (error) {
        console.error('Erreur schedules locaux:', error);
        schedules = [];
    }
}

async function loadMessages() {
    try {
        if (messagesListener) messagesListener();
        
        if (firebaseEnabled && db) {
            messagesListener = db.collection('messages')
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    displayConversations();
                    console.log(`✅ ${messages.length} messages chargés`);
                }, error => {
                    console.error('Erreur messages Firebase:', error);
                    loadLocalMessages();
                });
        } else {
            loadLocalMessages();
        }
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        loadLocalMessages();
    }
}

function loadLocalMessages() {
    try {
        messages = JSON.parse(localStorage.getItem('messages') || '[]');
        displayConversations();
        console.log(`✅ ${messages.length} messages locaux`);
    } catch (error) {
        console.error('Erreur messages locaux:', error);
        messages = [];
    }
}

// Fonctions utilitaires
function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'confirmed': 'Confirmé',
        'cancelled': 'Annulé'
    };
    return statusMap[status] || status;
}

function formatDate(dateStr) {
    try {
        if (!dateStr) return 'Non spécifié';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Non spécifié';
        return date.toLocaleDateString('fr-FR');
    } catch (error) {
        return 'Non spécifié';
    }
}

function formatDateTime(timestamp) {
    try {
        if (!timestamp) return 'Non spécifié';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Non spécifié';
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Non spécifié';
    }
}

// Événements de nettoyage
function cleanupListeners() {
    try {
        if (appointmentsListener) appointmentsListener();
        if (messagesListener) messagesListener();
        if (servicesListener) servicesListener();
        if (schedulesListener) schedulesListener();
        console.log('🧹 Listeners Firebase nettoyés');
    } catch (error) {
        console.error('Erreur nettoyage listeners:', error);
    }
}

// Événements globaux
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Démarrage de l\'interface admin...');
    initializeAdmin();
});

window.addEventListener('beforeunload', cleanupListeners);
window.addEventListener('unload', cleanupListeners);

// Exposer les fonctions nécessaires
window.verifyPassword = verifyPassword;