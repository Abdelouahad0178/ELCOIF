// main.js
// Import des fonctions des autres modules
import { loadServices, forceLoadDefaultServices, servicesLoaded, services } from './services.js';
import { loadSchedules, loadAppointments, setupAppointmentForm } from './appointments.js';
import { setupMessageInput, loadMessagesForClient } from './messages.js';

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

// Variables globales
let db = null;
let firebaseEnabled = false;
let clientPhone = localStorage.getItem('clientPhone') || '';
let servicesListener = null;
let schedulesListener = null;
let appointmentsListener = null;
let messagesListener = null;
let currentClientPhone = '';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialisation de l'application
async function initializeApp() {
    try {
        console.log('🚀 Initialisation de l\'application Salon Élégance...');

        setupNavigation();
        updateFirebaseStatus(false, 'Connexion...');

        await initializeFirebase();

        // Charger les services en premier
        await loadServices();

        // Attendre que les services soient chargés
        await waitForServices();

        await loadSchedules();
        await loadAppointments();

        // Configurer le formulaire et les messages
        setupAppointmentForm();
        setupMessageInput();

        // Restaurer les données du formulaire
        setTimeout(() => {
            restoreFormData();
        }, 500);

        console.log('✅ Application initialisée avec succès');
        showNotification('Application chargée avec succès !', 'success');

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement. Mode hors ligne activé.', 'error');

        if (!servicesLoaded) {
            forceLoadDefaultServices();
        }
    }
}

// Attendre le chargement des services
async function waitForServices() {
    return new Promise(resolve => {
        let attempts = 0;
        const maxAttempts = 30;

        const checkServices = () => {
            attempts++;
            if (servicesLoaded && services && services.length > 0) {
                console.log('✅ Services prêts, continuation de l\'initialisation');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.log('⏰ Timeout - Forcer le chargement des services par défaut');
                forceLoadDefaultServices();
                resolve();
            } else {
                setTimeout(checkServices, 100);
            }
        };
        checkServices();
    });
}

// Configurer la navigation
function setupNavigation() {
    try {
        document.querySelectorAll('.nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    document.querySelectorAll('.nav a').forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { rootMargin: '-50% 0px -50% 0px' });

        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });

        console.log('✅ Navigation configurée');
    } catch (error) {
        console.error('Erreur lors de la configuration de la navigation:', error);
    }
}

// Initialisation de Firebase
async function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase n\'est pas chargé');
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();

        const testPromise = db.collection('services').limit(1).get();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de connexion')), 5000)
        );

        await Promise.race([testPromise, timeoutPromise])
            .then(() => {
                firebaseEnabled = true;
                updateFirebaseStatus(true, 'Firebase connecté');
                console.log('✅ Firebase connecté avec succès');
            })
            .catch(error => {
                console.error('❌ Erreur de connexion Firebase:', error);
                firebaseEnabled = false;
                updateFirebaseStatus(false, 'Mode hors ligne');
                console.log('📱 Mode hors ligne activé');
            });
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
        firebaseEnabled = false;
        updateFirebaseStatus(false, 'Erreur de configuration');
    }
}

// Mettre à jour le statut Firebase
function updateFirebaseStatus(isOnline, statusText) {
    try {
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');
        if (indicator && text) {
            indicator.className = `status-indicator ${isOnline ? 'status-online' : 'status-offline'}`;
            text.textContent = statusText;
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
    }
}

// Sauvegarde et restauration des données du formulaire
function saveFormData() {
    try {
        const formData = {
            selectedServices: window.selectedServices || [],
            selectedStylist: window.selectedStylist || '',
            selectedTime: window.selectedTime || '',
            clientName: document.getElementById('clientName')?.value || '',
            clientPhone: document.getElementById('clientPhone')?.value || '',
            clientEmail: document.getElementById('clientEmail')?.value || '',
            appointmentDate: document.getElementById('dateSelect')?.value || '',
            notes: document.getElementById('notes')?.value || ''
        };

        localStorage.setItem('bookingFormData', JSON.stringify(formData));
        localStorage.setItem('bookingFormDataTime', Date.now().toString());
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données du formulaire:', error);
    }
}

function restoreFormData() {
    try {
        const savedData = localStorage.getItem('bookingFormData');
        const savedTime = localStorage.getItem('bookingFormDataTime');

        if (!savedData || !savedTime) return;

        if (Date.now() - parseInt(savedTime) > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('bookingFormData');
            localStorage.removeItem('bookingFormDataTime');
            return;
        }

        const formData = JSON.parse(savedData);

        if (formData.clientName) {
            const nameInput = document.getElementById('clientName');
            if (nameInput) nameInput.value = formData.clientName;
        }

        if (formData.clientPhone) {
            const phoneInput = document.getElementById('clientPhone');
            if (phoneInput) phoneInput.value = formData.clientPhone;
            clientPhone = formData.clientPhone;
        }

        if (formData.clientEmail) {
            const emailInput = document.getElementById('clientEmail');
            if (emailInput) emailInput.value = formData.clientEmail;
        }

        if (formData.appointmentDate) {
            const dateInput = document.getElementById('dateSelect');
            if (dateInput) {
                dateInput.value = formData.appointmentDate;
            }
        }

        if (formData.notes) {
            const notesInput = document.getElementById('notes');
            if (notesInput) notesInput.value = formData.notes;
        }

        window.selectedServices = formData.selectedServices || [];
        window.selectedStylist = formData.selectedStylist || '';
        window.selectedTime = formData.selectedTime || '';

        if (window.selectedStylist) {
            const stylistSelect = document.getElementById('stylistSelect');
            if (stylistSelect) {
                stylistSelect.value = window.selectedStylist;
            }
        }

        if (window.selectedServices && window.selectedServices.length > 0) {
            console.log('Restauration des services sélectionnés:', window.selectedServices);

            const waitForCheckboxes = () => {
                const checkboxes = document.querySelectorAll('input[name="services"]');
                if (checkboxes.length > 0) {
                    window.selectedServices.forEach(serviceId => {
                        const checkbox = document.getElementById(`service_${serviceId}`);
                        if (checkbox) {
                            checkbox.checked = true;
                            console.log('Service restauré:', serviceId);
                        }
                    });

                    window.updateSelectedServices && window.updateSelectedServices();

                    if (window.selectedStylist && formData.appointmentDate) {
                        setTimeout(() => {
                            window.updateAvailableTimes && window.updateAvailableTimes();
                            if (window.selectedTime) {
                                setTimeout(() => {
                                    const timeSelect = document.getElementById('timeSelect');
                                    if (timeSelect && timeSelect.querySelector(`option[value="${window.selectedTime}"]`)) {
                                        timeSelect.value = window.selectedTime;
                                        console.log('Heure restaurée:', window.selectedTime);
                                    }
                                }, 500);
                            }
                        }, 500);
                    }
                } else {
                    setTimeout(waitForCheckboxes, 200);
                }
            };

            waitForCheckboxes();
        }

        console.log('✅ Données du formulaire restaurées');

    } catch (error) {
        console.error('Erreur lors de la restauration des données:', error);
    }
}

// Fonctions utilitaires
function showNotification(message, type = 'info') {
    try {
        const container = document.getElementById('notificationContainer') || document.body;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, type === 'error' ? 5000 : 3000);

    } catch (error) {
        console.error('Erreur lors de l\'affichage de la notification:', error);
        alert(message);
    }
}

// Fonction pour rechercher les rendez-vous d'un client
function searchMyAppointments() {
    const phoneNumber = document.getElementById('searchPhone').value.trim();
    
    if (!phoneNumber) {
        showNotification('Veuillez saisir un numéro de téléphone.', 'error');
        return;
    }

    currentClientPhone = phoneNumber;
    
    // Import des fonctions nécessaires depuis appointments.js
    import('./appointments.js').then(module => {
        if (module.displayMyAppointments) {
            module.displayMyAppointments(currentClientPhone);
        }
    });
    
    loadMessagesForClient(phoneNumber);
}

// Rendre la fonction globale pour l'HTML
window.searchMyAppointments = searchMyAppointments;

// Nettoyer les listeners Firebase
function cleanupListeners() {
    try {
        if (servicesListener) servicesListener();
        if (schedulesListener) schedulesListener();
        if (appointmentsListener) appointmentsListener();
        if (messagesListener) messagesListener();
        console.log('✅ Listeners Firebase nettoyés');
    } catch (error) {
        console.error('Erreur lors du nettoyage des listeners:', error);
    }
}

// Événements
window.addEventListener('beforeunload', function() {
    cleanupListeners();
    if (document.getElementById('clientName')?.value) {
        saveFormData();
    }
});

window.addEventListener('error', function(event) {
    console.error('Erreur JavaScript globale:', event.error);
    showNotification('Une erreur inattendue s\'est produite. Veuillez actualiser la page.', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Promesse rejetée non gérée:', event.reason);
    if (event.reason?.message?.includes('Firebase')) {
        showNotification('Problème de connexion. Mode hors ligne activé.', 'info');
    }
});

// Gestion de la connectivité réseau
function setupNetworkDetection() {
    function updateOnlineStatus() {
        if (navigator.onLine) {
            console.log('🌐 Connexion rétablie');
            if (!firebaseEnabled) {
                setTimeout(() => {
                    initializeFirebase();
                }, 2000);
            }
        } else {
            console.log('📴 Connexion perdue - Mode hors ligne');
            updateFirebaseStatus(false, 'Hors ligne');
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    updateOnlineStatus();
}

// Gestion des raccourcis clavier
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('appointmentForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }

        if (e.key === 'Escape') {
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
        }
    });
}

// Performance monitoring
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`⚡ Temps de chargement total: ${loadTime}ms`);

        if (loadTime > 3000) {
            console.warn('⚠️ Temps de chargement lent détecté');
        }
    }
}

// Initialisation supplémentaire
setTimeout(() => {
    setupNetworkDetection();
    setupKeyboardShortcuts();
    console.log('✅ Fonctionnalités supplémentaires chargées');
}, 1000);

window.addEventListener('load', function() {
    setTimeout(logPerformance, 100);
});

// Debugging (à supprimer en production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugSalon = {
        showData: () => {
            console.log('=== DONNÉES SALON ÉLÉGANCE ===');
            console.log('Services:', services);
            console.log('Schedules:', window.schedules || []);
            console.log('Appointments:', window.appointments || []);
            console.log('Messages:', window.messages || []);
            console.log('Firebase enabled:', firebaseEnabled);
            console.log('Services loaded:', servicesLoaded);
            console.log('Client phone:', clientPhone);
            console.log('Selected services:', window.selectedServices || []);
            console.log('Selected stylist:', window.selectedStylist || '');
            console.log('Selected time:', window.selectedTime || '');
        },
        clearLocalData: () => {
            localStorage.clear();
            console.log('🗑️ Données locales effacées');
            location.reload();
        },
        testNotification: showNotification
    };
}

export { 
    db, 
    firebaseEnabled, 
    clientPhone, 
    servicesListener, 
    schedulesListener, 
    appointmentsListener, 
    messagesListener, 
    showNotification,
    currentClientPhone,
    saveFormData
};