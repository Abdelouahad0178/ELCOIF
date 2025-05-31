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
let services = [];
let schedules = [];
let appointments = [];
let messages = [];
let clientPhone = localStorage.getItem('clientPhone') || '';
let servicesListener = null;
let schedulesListener = null;
let appointmentsListener = null;
let messagesListener = null;

// Variables pour l'interface
let selectedServices = [];
let selectedTime = '';
let selectedStylist = '';
let currentClientPhone = '';
let servicesLoaded = false;

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
        
        // Charger les services en premier (priorité car nécessaires pour le formulaire)
        await loadServices();
        
        // Attendre que les services soient chargés avec timeout de sécurité
        await waitForServices();
        
        await loadSchedules();
        await loadAppointments();
        
        // Configurer le formulaire après que tout soit chargé
        setupAppointmentForm();
        setupMessageInput();
        
        // Restaurer les données du formulaire si disponibles
        setTimeout(() => {
            restoreFormData();
        }, 500);
        
        console.log('✅ Application initialisée avec succès');
        showNotification('Application chargée avec succès !', 'success');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement. Mode hors ligne activé.', 'error');
        
        // En cas d'erreur, forcer le chargement des services par défaut
        if (!servicesLoaded) {
            forceLoadDefaultServices();
        }
    }
}

// Attendre le chargement des services avec timeout
async function waitForServices() {
    return new Promise(resolve => {
        let attempts = 0;
        const maxAttempts = 30; // 3 secondes maximum
        
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

// Forcer le chargement des services par défaut
function forceLoadDefaultServices() {
    console.log('🔧 Forçage des services par défaut');
    if (servicesListener) servicesListener();
    services = [];
    servicesLoaded = false;
    loadDefaultServices();
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
        
        // Observer pour mettre à jour la navigation active
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
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        
        // Tester la connexion avec un timeout
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
                console.log('📱 Mode hors ligne activé - Données sauvegardées localement');
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

// Charger les services
async function loadServices() {
    try {
        if (servicesListener) servicesListener();
        
        if (firebaseEnabled && db) {
            servicesListener = db.collection('services').onSnapshot(snapshot => {
                if (snapshot.empty) {
                    console.log('⚠️ Collection services vide dans Firebase, chargement des services par défaut');
                    loadDefaultServices();
                } else {
                    services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    servicesLoaded = true;
                    displayServices();
                    populateServiceCheckboxes();
                    console.log(`✅ ${services.length} services chargés depuis Firebase`);
                }
            }, error => {
                console.error('Erreur lors du chargement des services Firebase:', error);
                loadDefaultServices();
            });
            
            // Timeout de sécurité : si aucun service n'est chargé après 2 secondes, utiliser les services par défaut
            setTimeout(() => {
                if (!servicesLoaded) {
                    console.log('⏰ Timeout Firebase - Chargement des services par défaut');
                    if (servicesListener) servicesListener();
                    loadDefaultServices();
                }
            }, 2000);
            
        } else {
            loadDefaultServices();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des services:', error);
        loadDefaultServices();
    }
}

// Charger les services par défaut
function loadDefaultServices() {
    try {
        services = JSON.parse(localStorage.getItem('services') || '[]');
        if (!services.length) {
            services = [
                { id: 'coupe-homme', name: 'Coupe Homme', price: 25, duration: 30 },
                { id: 'coupe-femme', name: 'Coupe Femme', price: 45, duration: 45 },
                { id: 'coloration', name: 'Coloration', price: 60, duration: 90 },
                { id: 'balayage', name: 'Balayage', price: 80, duration: 120 },
                { id: 'brushing', name: 'Brushing', price: 20, duration: 30 },
                { id: 'soin', name: 'Soin Capillaire', price: 30, duration: 45 }
            ];
            localStorage.setItem('services', JSON.stringify(services));
        }
        
        servicesLoaded = true;
        displayServices();
        populateServiceCheckboxes();
        
        console.log(`✅ ${services.length} services par défaut chargés et affichés`);
    } catch (error) {
        console.error('Erreur lors du chargement des services par défaut:', error);
        showNotification('Erreur lors du chargement des services.', 'error');
    }
}

// Afficher les services
function displayServices() {
    try {
        const container = document.getElementById('servicesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <h3>${service.name}</h3>
                <p>Durée : ${service.duration} min</p>
                <p class="service-price">${service.price} dhs</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur lors de l\'affichage des services:', error);
    }
}

// Remplir les cases à cocher des services
function populateServiceCheckboxes() {
    try {
        const container = document.getElementById('serviceCheckboxes');
        if (!container) {
            console.warn('Container serviceCheckboxes non trouvé');
            return;
        }
        
        // Vérifier que les services sont chargés
        if (!services || services.length === 0) {
            console.warn('Aucun service disponible pour créer les checkboxes');
            return;
        }
        
        container.innerHTML = '';
        console.log('Création des checkboxes pour', services.length, 'services');
        
        services.forEach((service, index) => {
            const div = document.createElement('div');
            div.className = 'checkbox-container';
            div.innerHTML = `
                <input type="checkbox" id="service_${service.id}" name="services" value="${service.id}">
                <label for="service_${service.id}">${service.name} (${service.price} dhs - ${service.duration}min)</label>
            `;
            container.appendChild(div);
            
            // Ajouter l'événement immédiatement après création
            const checkbox = div.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    console.log('Checkbox changé:', service.name, this.checked);
                    updateSelectedServices();
                    validateField('services');
                    saveFormData();
                });
            }
        });
        
        console.log('✅ Cases à cocher des services créées avec événements');
        
        // Vérifier que les checkboxes ont bien été créées
        const createdCheckboxes = container.querySelectorAll('input[name="services"]');
        console.log('Checkboxes créées:', createdCheckboxes.length);
        
    } catch (error) {
        console.error('Erreur lors du remplissage des services:', error);
    }
}

// Mettre à jour les services sélectionnés
function updateSelectedServices() {
    try {
        const checkboxes = document.querySelectorAll('input[name="services"]:checked');
        selectedServices = Array.from(checkboxes).map(cb => cb.value);
        console.log('Services mis à jour:', selectedServices);
        return selectedServices;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des services sélectionnés:', error);
        return [];
    }
}

// Charger les plannings
async function loadSchedules() {
    try {
        if (schedulesListener) schedulesListener();
        
        if (firebaseEnabled && db) {
            schedulesListener = db.collection('schedules').onSnapshot(snapshot => {
                schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`✅ ${schedules.length} plannings chargés depuis Firebase`);
            }, error => {
                console.error('Erreur lors du chargement des plannings Firebase:', error);
                loadDefaultSchedules();
            });
        } else {
            loadDefaultSchedules();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des plannings:', error);
        loadDefaultSchedules();
    }
}

// Charger les plannings par défaut
function loadDefaultSchedules() {
    try {
        schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
        if (!schedules.length) {
            // Créer des plannings par défaut pour les 30 prochains jours
            const stylists = ['Brahim', 'Ali', 'Mohamed'];
            const today = new Date();
            
            stylists.forEach(stylist => {
                const dates = [];
                for (let i = 0; i < 30; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    const dateString = date.toISOString().split('T')[0];
                    
                    // Ignorer les dimanches (0 = dimanche)
                    if (date.getDay() !== 0) {
                        dates.push({
                            date: dateString,
                            start: '09:00',
                            end: '18:00'
                        });
                    }
                }
                
                schedules.push({
                    stylistId: stylist,
                    dates: dates
                });
            });
            
            localStorage.setItem('schedules', JSON.stringify(schedules));
        }
        console.log(`✅ ${schedules.length} plannings par défaut chargés`);
    } catch (error) {
        console.error('Erreur lors du chargement des plannings par défaut:', error);
    }
}

// Charger les rendez-vous
async function loadAppointments() {
    try {
        if (appointmentsListener) appointmentsListener();
        
        if (firebaseEnabled && db) {
            appointmentsListener = db.collection('appointments')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log(`✅ ${appointments.length} rendez-vous chargés depuis Firebase`);
                }, error => {
                    console.error('Erreur lors du chargement des rendez-vous Firebase:', error);
                    loadLocalAppointments();
                });
        } else {
            loadLocalAppointments();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des rendez-vous:', error);
        loadLocalAppointments();
    }
}

// Charger les rendez-vous locaux
function loadLocalAppointments() {
    try {
        appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        console.log(`✅ ${appointments.length} rendez-vous locaux chargés`);
    } catch (error) {
        console.error('Erreur lors du chargement des rendez-vous locaux:', error);
        appointments = [];
    }
}

// Configurer le formulaire de rendez-vous - VERSION CORRIGÉE
function setupAppointmentForm() {
    try {
        const form = document.getElementById('appointmentForm');
        const dateInput = document.getElementById('dateSelect');
        const stylistSelect = document.getElementById('stylistSelect');
        const timeSelect = document.getElementById('timeSelect');

        if (!form) {
            console.warn('Formulaire de rendez-vous non trouvé dans le DOM');
            return;
        }

        // Configuration de la date
        if (dateInput) {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            dateInput.min = todayString;
            
            // Définir aujourd'hui par défaut si aucune date n'est définie
            if (!dateInput.value) {
                dateInput.value = todayString;
            }
            
            // Événement changement de date
            dateInput.addEventListener('change', function() {
                console.log('📅 Date changée vers:', this.value);
                selectedTime = ''; // Réinitialiser l'heure
                if (timeSelect) timeSelect.value = '';
                updateAvailableTimes();
                saveFormData();
            });

            console.log('✅ Date configurée:', dateInput.value);
        }
        
        // Configuration du coiffeur
        if (stylistSelect) {
            stylistSelect.addEventListener('change', function() {
                selectedStylist = this.value;
                console.log('👨‍💼 Coiffeur changé vers:', selectedStylist);
                selectedTime = ''; // Réinitialiser l'heure
                if (timeSelect) timeSelect.value = '';
                updateAvailableTimes();
                saveFormData();
            });

            console.log('✅ Sélecteur de coiffeur configuré');
        }

        // Configuration de l'heure
        if (timeSelect) {
            timeSelect.addEventListener('change', function() {
                selectedTime = this.value;
                console.log('🕐 Heure sélectionnée:', selectedTime);
                
                // Validation immédiate
                if (selectedTime) {
                    hideTimeError();
                } else {
                    showTimeError('Veuillez sélectionner une heure');
                }
                
                saveFormData();
            });

            console.log('✅ Sélecteur d\'heure configuré');
        }

        // Configuration de la validation des champs
        setupFieldValidation();

        // Configuration de la soumission
        form.addEventListener('submit', handleFormSubmit);

        // Initialisation des horaires après un délai
        setTimeout(() => {
            console.log('🔄 Initialisation des créneaux horaires...');
            updateAvailableTimes();
        }, 500);

        console.log('✅ Formulaire de rendez-vous configuré complètement');
    } catch (error) {
        console.error('❌ Erreur lors de la configuration du formulaire:', error);
    }
}

// Fonctions d'aide pour les erreurs d'heure
function showTimeError(message) {
    const errorElement = document.getElementById('timeSelectError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#e74c3c';
    }
}

function hideTimeError() {
    const errorElement = document.getElementById('timeSelectError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Initialiser les créneaux horaires
function initializeTimeSlots() {
    const dateInput = document.getElementById('dateSelect');
    const stylistSelect = document.getElementById('stylistSelect');
    
    // Si une date et un coiffeur sont déjà sélectionnés, mettre à jour les horaires
    if (dateInput?.value && stylistSelect?.value) {
        updateAvailableTimes();
    } else if (dateInput?.value) {
        // Si seulement une date est sélectionnée, générer des horaires par défaut
        generateDefaultTimeSlots(document.getElementById('timeSelect'), dateInput.value);
    }
}

// Valider la sélection d'heure
function validateTimeSelection() {
    const timeSelect = document.getElementById('timeSelect');
    const timeError = document.getElementById('timeSelectError');
    
    if (!timeSelect?.value) {
        if (timeError) {
            timeError.textContent = 'Veuillez sélectionner une heure.';
            timeError.style.display = 'block';
        }
        return false;
    } else {
        if (timeError) {
            timeError.style.display = 'none';
        }
        return true;
    }
}

// Configurer la validation des champs
function setupFieldValidation() {
    const fieldsToValidate = ['clientName', 'clientPhone', 'clientEmail'];
    
    fieldsToValidate.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                validateField(fieldId);
                saveFormData();
            });
            
            // Formatage spécial pour le téléphone
            if (fieldId === 'clientPhone') {
                field.addEventListener('input', function() {
                    let value = this.value.replace(/[^0-9+]/g, '');
                    if (value.length > 0 && !value.startsWith('+212')) {
                        if (value.startsWith('0')) {
                            value = '+212' + value.substring(1);
                        } else if (!value.startsWith('+')) {
                            value = '+212' + value;
                        }
                    }
                    if (value.length > 13) {
                        value = value.substring(0, 13);
                    }
                    this.value = value;
                });
            }
            
            // Formatage pour le nom (lettres uniquement)
            if (fieldId === 'clientName') {
                field.addEventListener('input', function() {
                    this.value = this.value.replace(/[^a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s-]/g, '');
                });
            }
        }
    });
}

// Gérer la soumission du formulaire
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        const submitButton = document.querySelector('#appointmentForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Envoi en cours...';
        }

        if (validateForm()) {
            await submitAppointment();
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        showNotification('Erreur lors de la soumission du formulaire.', 'error');
    } finally {
        const submitButton = document.querySelector('#appointmentForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirmer le rendez-vous';
        }
    }
}

// Mettre à jour les horaires disponibles - VERSION CORRIGÉE
function updateAvailableTimes() {
    try {
        const dateSelect = document.getElementById('dateSelect');
        const stylistSelect = document.getElementById('stylistSelect');
        const timeSelect = document.getElementById('timeSelect');

        if (!timeSelect) {
            console.error('❌ Element timeSelect non trouvé');
            return;
        }

        const selectedDate = dateSelect?.value;
        const selectedStylist = stylistSelect?.value;

        console.log('🕐 Mise à jour horaires - Date:', selectedDate, 'Coiffeur:', selectedStylist);

        // Sauvegarder la sélection actuelle
        const currentSelection = timeSelect.value;

        // Vider et réinitialiser
        timeSelect.innerHTML = '<option value="">Sélectionner une heure</option>';

        // Si pas de date, afficher message
        if (!selectedDate) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '⚠️ Sélectionnez d\'abord une date';
            option.disabled = true;
            timeSelect.appendChild(option);
            return;
        }

        // Si pas de coiffeur, afficher message
        if (!selectedStylist) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '⚠️ Sélectionnez d\'abord un coiffeur';
            option.disabled = true;
            timeSelect.appendChild(option);
            return;
        }

        // Générer les créneaux
        const slots = generateAllTimeSlots(selectedDate, selectedStylist);
        
        if (slots.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '❌ Aucun créneau disponible';
            option.disabled = true;
            timeSelect.appendChild(option);
            console.log('❌ Aucun créneau disponible');
        } else {
            // Ajouter tous les créneaux
            slots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.time;
                option.textContent = `${slot.time} ${slot.status ? '(' + slot.status + ')' : ''}`;
                if (slot.disabled) {
                    option.disabled = true;
                    option.style.color = '#999';
                }
                timeSelect.appendChild(option);
            });

            console.log(`✅ ${slots.filter(s => !s.disabled).length} créneaux disponibles sur ${slots.length} total`);

            // Restaurer la sélection si possible
            if (currentSelection && slots.find(s => s.time === currentSelection && !s.disabled)) {
                timeSelect.value = currentSelection;
                selectedTime = currentSelection;
                console.log('✅ Sélection restaurée:', currentSelection);
            }
        }

    } catch (error) {
        console.error('❌ Erreur updateAvailableTimes:', error);
        // En cas d'erreur, créer au moins des créneaux basiques
        createBasicTimeSlots();
    }
}

// Générer tous les créneaux possibles
function generateAllTimeSlots(selectedDate, selectedStylist) {
    const slots = [];
    const baseSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const isToday = selectedDate === today;

    baseSlots.forEach(timeStr => {
        const slot = {
            time: timeStr,
            disabled: false,
            status: ''
        };

        // Vérifier si c'est dans le passé (pour aujourd'hui)
        if (isToday) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const slotTime = hours * 60 + minutes;
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            if (slotTime <= currentTime + 30) { // 30 min de marge
                slot.disabled = true;
                slot.status = 'passé';
            }
        }

        // Vérifier les conflits avec rendez-vous existants
        if (!slot.disabled) {
            const hasConflict = appointments.some(apt => 
                apt.date === selectedDate && 
                apt.stylist === selectedStylist && 
                apt.status !== 'cancelled' &&
                apt.time === timeStr
            );

            if (hasConflict) {
                slot.disabled = true;
                slot.status = 'occupé';
            }
        }

        slots.push(slot);
    });

    return slots;
}

// Créer des créneaux basiques en cas d'erreur
function createBasicTimeSlots() {
    const timeSelect = document.getElementById('timeSelect');
    if (!timeSelect) return;

    const basicSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    
    basicSlots.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });

    console.log('🔧 Créneaux basiques créés en fallback');
}

// Générer les créneaux horaires basés sur le planning
function generateTimeSlots(daySchedule, existingAppointments, selectedDate) {
    const availableSlots = [];
    
    const startTime = parseTime(daySchedule.start);
    const endTime = parseTime(daySchedule.end);
    let currentTime = startTime;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const isToday = selectedDate === today;

    while (currentTime < endTime - (30 * 60 * 1000)) { // S'arrêter 30 min avant la fin
        const timeStr = formatTime(currentTime);
        let isAvailable = true;

        // Vérifier les conflits avec les rendez-vous existants
        for (const apt of existingAppointments) {
            if (hasTimeConflict(timeStr, apt)) {
                isAvailable = false;
                break;
            }
        }

        // Vérifier si l'heure n'est pas dans le passé pour aujourd'hui
        if (isToday && isPastTime(timeStr, now)) {
            isAvailable = false;
        }

        if (isAvailable) {
            availableSlots.push(timeStr);
        }

        currentTime += 30 * 60 * 1000; // Ajouter 30 minutes
    }

    return availableSlots;
}

// Vérifier les conflits d'horaires
function hasTimeConflict(timeStr, appointment) {
    try {
        const slotStart = new Date(`${appointment.date}T${timeStr}`);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
        
        const aptStart = new Date(`${appointment.date}T${appointment.time}`);
        const aptDuration = appointment.totalDuration || 30;
        const aptEnd = new Date(aptStart.getTime() + aptDuration * 60 * 1000);
        
        // Vérifier le chevauchement
        return (
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)
        );
    } catch (error) {
        console.error('Erreur lors de la vérification des conflits:', error);
        return true; // En cas d'erreur, considérer comme non disponible
    }
}

// Vérifier si l'heure est dans le passé
function isPastTime(timeStr, now) {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        return hours < currentHour || (hours === currentHour && minutes <= currentMinutes + 15);
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'heure passée:', error);
        return true;
    }
}

// Ajouter une option désactivée
function addDisabledOption(selectElement, text) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    option.disabled = true;
    selectElement.appendChild(option);
}

// Restaurer la sélection d'heure précédente
function restoreTimeSelection(timeSelect, previouslySelectedTime) {
    if (previouslySelectedTime && timeSelect.querySelector(`option[value="${previouslySelectedTime}"]`)) {
        timeSelect.value = previouslySelectedTime;
        selectedTime = previouslySelectedTime;
        console.log('✅ Heure précédente restaurée:', previouslySelectedTime);
    } else if (previouslySelectedTime) {
        console.log('⚠️ Heure précédente non disponible:', previouslySelectedTime);
        selectedTime = '';
    }
}

// Générer des créneaux horaires par défaut
function generateDefaultTimeSlots(timeSelect, selectedDate) {
    if (!timeSelect || !selectedDate) {
        console.warn('Paramètres manquants pour generateDefaultTimeSlots');
        return;
    }
    
    console.log('🕐 Génération des créneaux par défaut pour', selectedDate);
    
    const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    let availableCount = 0;
    
    defaultSlots.forEach(timeStr => {
        let isAvailable = true;
        
        // Vérifier si l'heure n'est pas dans le passé pour aujourd'hui
        if (isToday && isPastTime(timeStr, now)) {
            isAvailable = false;
        }
        
        if (isAvailable) {
            const option = document.createElement('option');
            option.value = timeStr;
            option.textContent = timeStr;
            timeSelect.appendChild(option);
            availableCount++;
        }
    });
    
    if (availableCount === 0) {
        addDisabledOption(timeSelect, 'Aucun créneau disponible aujourd\'hui');
    }
    
    console.log(`✅ ${availableCount} créneaux par défaut générés`);
}

// Valider tout le formulaire avec vérification spéciale de l'heure
function validateForm() {
    try {
        // Forcer la mise à jour des services sélectionnés avant validation
        updateSelectedServices();
        
        const isNameValid = validateField('clientName');
        const isPhoneValid = validateField('clientPhone');
        const isEmailValid = validateField('clientEmail');
        const areServicesValid = validateField('services');
        
        // Vérifier les champs obligatoires
        const stylist = document.getElementById('stylistSelect')?.value;
        const date = document.getElementById('dateSelect')?.value;
        const time = document.getElementById('timeSelect')?.value;
        
        if (!stylist) {
            showNotification('Veuillez sélectionner un coiffeur.', 'error');
            document.getElementById('stylistSelect')?.focus();
            return false;
        }
        
        if (!date) {
            showNotification('Veuillez sélectionner une date.', 'error');
            document.getElementById('dateSelect')?.focus();
            return false;
        }
        
        // Vérification spéciale pour l'heure
        if (!time) {
            const timeSelect = document.getElementById('timeSelect');
            const optionsCount = timeSelect?.options?.length || 0;
            
            if (optionsCount <= 1) {
                showNotification('Aucun créneau disponible pour cette date et ce coiffeur. Essayez une autre date.', 'error');
            } else {
                showNotification('Veuillez sélectionner une heure parmi les créneaux disponibles.', 'error');
            }
            
            document.getElementById('timeSelect')?.focus();
            return false;
        }
        
        // Vérification finale des services
        if (selectedServices.length === 0) {
            showNotification('Veuillez sélectionner au moins un service.', 'error');
            const firstServiceCheckbox = document.querySelector('input[name="services"]');
            if (firstServiceCheckbox) {
                firstServiceCheckbox.focus();
            }
            return false;
        }
        
        console.log('✅ Validation du formulaire - Tout est valide');
        console.log('   Services sélectionnés:', selectedServices);
        console.log('   Coiffeur:', stylist);
        console.log('   Date:', date);
        console.log('   Heure:', time);
        
        return isNameValid && isPhoneValid && isEmailValid && areServicesValid;
    } catch (error) {
        console.error('Erreur lors de la validation du formulaire:', error);
        return false;
    }
}

// Parser une heure (HH:MM) en millisecondes depuis minuit
function parseTime(timeStr) {
    try {
        if (!timeStr || !timeStr.match(/^\d{2}:\d{2}$/)) {
            console.error('Format d\'heure invalide:', timeStr);
            return 0;
        }
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            console.error('Heure invalide:', timeStr);
            return 0;
        }
        return (hours * 60 + minutes) * 60 * 1000;
    } catch (error) {
        console.error('Erreur lors du parsing de l\'heure:', error);
        return 0;
    }
}

// Formater une heure en HH:MM
function formatTime(ms) {
    try {
        if (ms < 0) {
            console.error('Temps invalide:', ms);
            return '00:00';
        }
        const totalMinutes = Math.floor(ms / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } catch (error) {
        console.error('Erreur lors du formatage de l\'heure:', error);
        return '00:00';
    }
}

// Valider un champ spécifique
function validateField(fieldId) {
    try {
        let isValid = true;
        const errorElement = document.getElementById(`${fieldId}Error`);
        
        if (!errorElement) return true;

        switch (fieldId) {
            case 'clientName':
                const nameInput = document.getElementById('clientName');
                if (!nameInput?.value?.trim() || nameInput.value.trim().length < 2) {
                    showFieldError(errorElement, 'Le nom doit contenir au moins 2 caractères.');
                    isValid = false;
                } else {
                    hideFieldError(errorElement);
                }
                break;
                
            case 'clientEmail':
                const emailInput = document.getElementById('clientEmail');
                if (emailInput?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
                    showFieldError(errorElement, 'Format email invalide.');
                    isValid = false;
                } else {
                    hideFieldError(errorElement);
                }
                break;
                
            case 'services':
                // Forcer la mise à jour des services sélectionnés
                const currentSelectedServices = updateSelectedServices();
                if (currentSelectedServices.length === 0) {
                    showFieldError(errorElement, 'Veuillez sélectionner au moins un service.');
                    isValid = false;
                } else {
                    hideFieldError(errorElement);
                }
                break;
        }

        return isValid;
    } catch (error) {
        console.error('Erreur lors de la validation:', error);
        return false;
    }
}

function showFieldError(errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideFieldError(errorElement) {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Valider tout le formulaire
function validateForm() {
    try {
        // Forcer la mise à jour des services sélectionnés avant validation
        updateSelectedServices();
        
        const isNameValid = validateField('clientName');
        const isPhoneValid = validateField('clientPhone');
        const isEmailValid = validateField('clientEmail');
        const areServicesValid = validateField('services');
        
        // Vérifier les champs obligatoires
        const stylist = document.getElementById('stylistSelect')?.value;
        const date = document.getElementById('dateSelect')?.value;
        const time = document.getElementById('timeSelect')?.value;
        
        if (!stylist) {
            showNotification('Veuillez sélectionner un coiffeur.', 'error');
            document.getElementById('stylistSelect')?.focus();
            return false;
        }
        
        if (!date) {
            showNotification('Veuillez sélectionner une date.', 'error');
            document.getElementById('dateSelect')?.focus();
            return false;
        }
        
        if (!time) {
            showNotification('Veuillez sélectionner une heure. Si aucune heure n\'est disponible, essayez une autre date ou un autre coiffeur.', 'error');
            document.getElementById('timeSelect')?.focus();
            return false;
        }
        
        // Vérification finale des services
        if (selectedServices.length === 0) {
            showNotification('Veuillez sélectionner au moins un service.', 'error');
            const firstServiceCheckbox = document.querySelector('input[name="services"]');
            if (firstServiceCheckbox) {
                firstServiceCheckbox.focus();
            }
            return false;
        }
        
        console.log('Validation du formulaire - Tout est valide');
        console.log('Services sélectionnés:', selectedServices);
        console.log('Coiffeur:', stylist);
        console.log('Date:', date);
        console.log('Heure:', time);
        
        return isNameValid && isPhoneValid && isEmailValid && areServicesValid;
    } catch (error) {
        console.error('Erreur lors de la validation du formulaire:', error);
        return false;
    }
}

// Soumettre un rendez-vous
async function submitAppointment() {
    try {
        const clientName = document.getElementById('clientName').value.trim();
        const clientPhoneInput = document.getElementById('clientPhone').value.trim();
        const clientEmail = document.getElementById('clientEmail').value.trim();
        const stylist = document.getElementById('stylistSelect').value;
        const date = document.getElementById('dateSelect').value;
        const time = document.getElementById('timeSelect').value;
        const notes = document.getElementById('notes').value.trim();

        // Mise à jour finale des services sélectionnés
        updateSelectedServices();
        
        console.log('Soumission - Services sélectionnés:', selectedServices);

        if (!clientName || !clientPhoneInput || !selectedServices.length || !stylist || !date || !time) {
            showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

        // Calculer le prix et la durée totale
        let totalPrice = 0;
        let totalDuration = 0;
        const serviceDetails = [];

        selectedServices.forEach(serviceId => {
            const service = services.find(s => s.id === serviceId);
            if (service) {
                totalPrice += service.price;
                totalDuration += service.duration;
                serviceDetails.push({
                    id: service.id,
                    name: service.name,
                    price: service.price,
                    duration: service.duration
                });
            }
        });

        console.log('Prix total:', totalPrice, 'dhs');
        console.log('Durée totale:', totalDuration, 'min');
        console.log('Détails des services:', serviceDetails);

        // Créer l'objet rendez-vous
        const appointment = {
            id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clientName,
            clientPhone: clientPhoneInput,
            clientEmail: clientEmail || null,
            services: selectedServices,
            serviceDetails,
            stylist,
            date,
            time,
            notes: notes || null,
            totalPrice,
            totalDuration,
            status: 'pending',
            createdAt: new Date().toISOString(),
            source: firebaseEnabled ? 'firebase' : 'local'
        };

        console.log('Rendez-vous à sauvegarder:', appointment);

        // Sauvegarder le rendez-vous
        if (firebaseEnabled && db) {
            await db.collection('appointments').doc(appointment.id).set(appointment);
            console.log('✅ Rendez-vous sauvegardé dans Firebase');
        } else {
            const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            localAppointments.push(appointment);
            localStorage.setItem('appointments', JSON.stringify(localAppointments));
            console.log('✅ Rendez-vous sauvegardé localement');
        }

        // Stocker le numéro de téléphone pour la prochaine fois
        clientPhone = clientPhoneInput;
        localStorage.setItem('clientPhone', clientPhone);

        // Réinitialiser le formulaire
        resetForm();

        // Charger les messages pour ce client
        await loadMessagesForClient(clientPhoneInput);

        showNotification(`Rendez-vous soumis avec succès ! Total: ${totalPrice} dhs pour ${totalDuration} minutes. Vous recevrez une confirmation bientôt.`, 'success');
        
        // Faire défiler vers la section des messages
        setTimeout(() => {
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 1000);

    } catch (error) {
        console.error('Erreur lors de la soumission du rendez-vous:', error);
        showNotification(`Erreur lors de la soumission : ${error.message}`, 'error');
    }
}

// Réinitialiser le formulaire
function resetForm() {
    try {
        const form = document.getElementById('appointmentForm');
        if (form) {
            form.reset();
            
            // Réinitialiser la date à aujourd'hui
            const dateInput = document.getElementById('dateSelect');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Réinitialiser les horaires
            const timeSelect = document.getElementById('timeSelect');
            if (timeSelect) {
                timeSelect.innerHTML = '<option value="">Choisir une heure</option>';
            }
            
            // Cacher les messages d'erreur
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
            
            // Restaurer le téléphone s'il était pré-rempli
            const phoneInput = document.getElementById('clientPhone');
            if (phoneInput && clientPhone) {
                phoneInput.value = clientPhone;
            }
            
            // Réinitialiser les services sélectionnés
            selectedServices = [];
            selectedTime = '';
            selectedStylist = '';
            
            // Décocher toutes les cases
            document.querySelectorAll('input[name="services"]').forEach(cb => {
                cb.checked = false;
            });
        }
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du formulaire:', error);
    }
}

// Rechercher mes rendez-vous
function searchMyAppointments() {
    const phoneNumber = document.getElementById('searchPhone').value.trim();
    
    if (!phoneNumber) {
        showNotification('Veuillez saisir un numéro de téléphone.', 'error');
        return;
    }

    currentClientPhone = phoneNumber;
    displayMyAppointments();
    loadMessagesForClient(phoneNumber);
}

// Afficher mes rendez-vous
function displayMyAppointments() {
    const clientAppointments = appointments.filter(apt => 
        apt.clientPhone.replace(/\s/g, '') === currentClientPhone.replace(/\s/g, '')
    );

    const container = document.getElementById('myAppointments');
    container.innerHTML = '';

    if (clientAppointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Aucun rendez-vous trouvé</h3><p>Aucun rendez-vous trouvé pour ce numéro.</p></div>';
        return;
    }

    // Trier par date (plus récents en premier)
    const sortedAppointments = [...clientAppointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
    });

    sortedAppointments.forEach(appointment => {
        const card = createMyAppointmentCard(appointment);
        container.appendChild(card);
    });
}

// Créer une carte de rendez-vous client
function createMyAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = `appointment-card status-${appointment.status}`;

    const serviceNames = appointment.services ? appointment.services.map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return service ? service.name : serviceId;
    }).join(', ') : 'Services non spécifiés';

    const statusText = {
        'pending': 'En attente de confirmation',
        'confirmed': 'Confirmé',
        'cancelled': 'Annulé'
    };

    const statusClass = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'cancelled': 'status-cancelled'
    };

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <strong style="color: #2c3e50;">${appointment.clientName}</strong>
            <span class="status-badge ${statusClass[appointment.status]}">${statusText[appointment.status]}</span>
        </div>
        <div class="appointment-info">
            <strong>Date:</strong> ${formatDate(appointment.date)}
        </div>
        <div class="appointment-info">
            <strong>Heure:</strong> ${appointment.time}
        </div>
        <div class="appointment-info">
            <strong>Coiffeur:</strong> ${appointment.stylist}
        </div>
        <div class="appointment-info">
            <strong>Services:</strong> ${serviceNames}
        </div>
        <div class="appointment-info">
            <strong>Durée:</strong> ${appointment.totalDuration} min
        </div>
        <div class="appointment-info">
            <strong>Prix:</strong> ${appointment.totalPrice} dhs
        </div>
        ${appointment.notes ? `<div class="appointment-info"><strong>Notes:</strong> ${appointment.notes}</div>` : ''}
        ${appointment.status === 'pending' || appointment.status === 'confirmed' ? 
            `<div class="appointment-actions" style="margin-top: 15px;">
                <button class="btn btn-danger btn-small" onclick="cancelMyAppointment('${appointment.id}')">
                    ${appointment.status === 'pending' ? 'Annuler ma demande' : 'Annuler RDV'}
                </button>
            </div>` : ''
        }
    `;

    return card;
}

// Annuler mon rendez-vous
async function cancelMyAppointment(appointmentId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
        return;
    }

    try {
        const appointmentToCancel = appointments.find(apt => apt.id === appointmentId);
        
        if (firebaseEnabled && db && appointmentToCancel?.source === 'firebase') {
            await db.collection('appointments').doc(appointmentId).update({
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'client'
            });
            console.log('✅ Rendez-vous annulé sur Firebase');
            showNotification('Rendez-vous annulé avec succès.', 'info');
        } else {
            // Mettre à jour le localStorage
            const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            const updatedAppointments = localAppointments.map(apt => 
                apt.id === appointmentId ? {...apt, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'client'} : apt
            );
            localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
            
            // Mettre à jour la liste locale
            const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
            if (appointmentIndex !== -1) {
                appointments[appointmentIndex].status = 'cancelled';
                appointments[appointmentIndex].cancelledAt = new Date().toISOString();
                appointments[appointmentIndex].cancelledBy = 'client';
            }
            
            console.log('💾 Rendez-vous annulé localement');
            showNotification('Rendez-vous annulé.', 'info');
        }

        displayMyAppointments();

    } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
        showNotification('Erreur lors de l\'annulation. Veuillez réessayer.', 'error');
    }
}

// Charger les messages pour un client
async function loadMessagesForClient(phoneNumber) {
    try {
        if (!phoneNumber) return;
        
        clientPhone = phoneNumber;
        localStorage.setItem('clientPhone', clientPhone);

        if (messagesListener) messagesListener();

        if (firebaseEnabled && db) {
            messagesListener = db.collection('messages')
                .where('phone', '==', phoneNumber)
                .orderBy('timestamp', 'asc')
                .onSnapshot(snapshot => {
                    messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    displayMessages();
                    console.log(`✅ ${messages.length} messages chargés depuis Firebase`);
                }, error => {
                    console.error('Erreur lors du chargement des messages:', error);
                    loadLocalMessages(phoneNumber);
                });
        } else {
            loadLocalMessages(phoneNumber);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        loadLocalMessages(phoneNumber);
    }
}

// Charger les messages locaux
function loadLocalMessages(phoneNumber) {
    try {
        const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
        messages = allMessages.filter(m => m.phone === phoneNumber);
        displayMessages();
        console.log(`✅ ${messages.length} messages locaux chargés`);
    } catch (error) {
        console.error('Erreur lors du chargement des messages locaux:', error);
        messages = [];
        displayMessages();
    }
}

// Afficher les messages
function displayMessages() {
    try {
        const container = document.getElementById('clientMessages');
        if (!container) return;

        container.innerHTML = '';

        if (!messages.length) {
            container.innerHTML = `
                <div class="empty-messages">
                    <h3>💬 Bienvenue !</h3>
                    <p>Commencez votre conversation avec notre salon.</p>
                    <p>Nous sommes là pour répondre à toutes vos questions !</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === 'client' ? 'client' : 'salon'}`;
            messageDiv.innerHTML = `
                <div>${msg.text}</div>
                <div class="message-time">${formatDateTime(msg.timestamp)}</div>
            `;
            container.appendChild(messageDiv);
        });

        // Faire défiler vers le bas
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Erreur lors de l\'affichage des messages:', error);
    }
}

// Envoyer un message client
async function sendClientMessage() {
    try {
        const messageInput = document.getElementById('clientMessageInput');
        const messageText = messageInput?.value?.trim();
        
        if (!messageText) {
            showNotification('Veuillez écrire un message.', 'error');
            return;
        }

        // Vérifier le numéro de téléphone
        if (!clientPhone) {
            const phoneInput = document.getElementById('clientPhone');
            if (phoneInput?.value && /^\+212[5-7][0-9]{8}$/.test(phoneInput.value)) {
                clientPhone = phoneInput.value;
                localStorage.setItem('clientPhone', clientPhone);
            } else {
                showNotification('Veuillez d\'abord remplir le formulaire de rendez-vous avec un numéro de téléphone valide.', 'error');
                return;
            }
        }

        const clientName = document.getElementById('clientName')?.value?.trim() || 'Client';

        const message = {
            phone: clientPhone,
            text: messageText,
            sender: 'client',
            timestamp: new Date().toISOString(),
            read: false,
            clientName: clientName
        };

        // Sauvegarder le message
        if (firebaseEnabled && db) {
            await db.collection('messages').add(message);
            console.log('✅ Message envoyé via Firebase');
        } else {
            const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
            const messageWithId = { ...message, id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
            allMessages.push(messageWithId);
            localStorage.setItem('messages', JSON.stringify(allMessages));
            
            // Ajouter à la liste locale et afficher
            messages.push(messageWithId);
            displayMessages();
            console.log('✅ Message sauvegardé localement');
        }

        // Vider le champ de saisie
        messageInput.value = '';
        showNotification('Message envoyé !', 'success');

    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        showNotification(`Erreur lors de l\'envoi du message : ${error.message}`, 'error');
    }
}

// Configurer l'entrée de message
function setupMessageInput() {
    try {
        const messageInput = document.getElementById('clientMessageInput');
        if (!messageInput) return;

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendClientMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        console.log('✅ Entrée de message configurée');
    } catch (error) {
        console.error('Erreur lors de la configuration de l\'entrée de message:', error);
    }
}

// Sauvegarde et restauration des données du formulaire
function saveFormData() {
    try {
        const formData = {
            selectedServices,
            selectedStylist,
            selectedTime,
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
        
        // Vérifier si les données ne sont pas trop anciennes (24h)
        if (Date.now() - parseInt(savedTime) > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('bookingFormData');
            localStorage.removeItem('bookingFormDataTime');
            return;
        }
        
        const formData = JSON.parse(savedData);
        
        // Restaurer les champs
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
        
        selectedServices = formData.selectedServices || [];
        selectedStylist = formData.selectedStylist || '';
        selectedTime = formData.selectedTime || '';
        
        if (selectedStylist) {
            const stylistSelect = document.getElementById('stylistSelect');
            if (stylistSelect) {
                stylistSelect.value = selectedStylist;
            }
        }
        
        // Restaurer les services sélectionnés avec vérification
        if (selectedServices && selectedServices.length > 0) {
            console.log('Restauration des services sélectionnés:', selectedServices);
            
            // Attendre que les checkboxes soient créées
            const waitForCheckboxes = () => {
                const checkboxes = document.querySelectorAll('input[name="services"]');
                if (checkboxes.length > 0) {
                    selectedServices.forEach(serviceId => {
                        const checkbox = document.getElementById(`service_${serviceId}`);
                        if (checkbox) {
                            checkbox.checked = true;
                            console.log('Service restauré:', serviceId);
                        } else {
                            console.warn('Checkbox non trouvée pour le service:', serviceId);
                        }
                    });
                    
                    // Mettre à jour la liste des services sélectionnés
                    updateSelectedServices();
                    
                    // Déclencher la mise à jour des horaires si nécessaire
                    if (selectedStylist && formData.appointmentDate) {
                        setTimeout(() => {
                            updateAvailableTimes();
                            // Restaurer l'heure sélectionnée
                            if (selectedTime) {
                                setTimeout(() => {
                                    const timeSelect = document.getElementById('timeSelect');
                                    if (timeSelect && timeSelect.querySelector(`option[value="${selectedTime}"]`)) {
                                        timeSelect.value = selectedTime;
                                        console.log('Heure restaurée:', selectedTime);
                                    }
                                }, 500);
                            }
                        }, 500);
                    }
                } else {
                    console.log('Checkboxes pas encore créées, nouvelle tentative...');
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
function formatDate(dateString) {
    try {
        if (!dateString) return 'Non spécifié';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Non spécifié';
        
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

// Afficher une notification
function showNotification(message, type = 'info') {
    try {
        const container = document.getElementById('notificationContainer') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Suppression automatique
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
        // Fallback vers alert si la notification échoue
        alert(message);
    }
}

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

// Événement de déchargement pour nettoyer les listeners
window.addEventListener('beforeunload', function() {
    cleanupListeners();
    // Sauvegarder les données du formulaire avant de quitter
    if (document.getElementById('clientName')?.value) {
        saveFormData();
    }
});

// Gestion des erreurs globales
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
                // Tentative de reconnexion à Firebase
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
    
    // Vérification initiale
    updateOnlineStatus();
}

// Gestion des raccourcis clavier
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter pour soumettre le formulaire
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('appointmentForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Échap pour réinitialiser les messages d'erreur
        if (e.key === 'Escape') {
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
        }
    });
}

// Initialiser les fonctionnalités supplémentaires
setTimeout(() => {
    setupNetworkDetection();
    setupKeyboardShortcuts();
    console.log('✅ Fonctionnalités supplémentaires chargées');
}, 1000);

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

// Logs de performance après le chargement complet
window.addEventListener('load', function() {
    setTimeout(logPerformance, 100);
});

// Fonctions de debugging (à supprimer en production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugSalon = {
        showData: () => {
            console.log('=== DONNÉES SALON ÉLÉGANCE ===');
            console.log('Services:', services);
            console.log('Schedules:', schedules);
            console.log('Appointments:', appointments);
            console.log('Messages:', messages);
            console.log('Firebase enabled:', firebaseEnabled);
            console.log('Services loaded:', servicesLoaded);
            console.log('Client phone:', clientPhone);
            console.log('Selected services:', selectedServices);
            console.log('Selected stylist:', selectedStylist);
            console.log('Selected time:', selectedTime);
        },
        
        clearLocalData: () => {
            localStorage.clear();
            console.log('🗑️ Données locales effacées');
            location.reload();
        },
        
        testNotification: (message = 'Test de notification', type = 'info') => {
            showNotification(message, type);
        },
        
        simulateAppointment: () => {
            const testAppointment = {
                id: `test_${Date.now()}`,
                clientName: 'Client Test',
                clientPhone: '+212612345678',
                clientEmail: 'test@example.com',
                services: ['coupe-homme'],
                stylist: 'Brahim',
                date: new Date().toISOString().split('T')[0],
                time: '10:00',
                totalPrice: 25,
                totalDuration: 30,
                status: 'pending',
                createdAt: new Date().toISOString(),
                source: 'debug'
            };
            
            appointments.push(testAppointment);
            
            // Sauvegarder localement
            const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            localAppointments.push(testAppointment);
            localStorage.setItem('appointments', JSON.stringify(localAppointments));
            
            console.log('✅ Rendez-vous de test créé:', testAppointment);
        },
        
        simulateMessage: (content = 'Message de test du salon') => {
            if (!clientPhone) {
                console.error('❌ Aucun téléphone client défini');
                return;
            }
            
            const testMessage = {
                id: `test_msg_${Date.now()}`,
                phone: clientPhone,
                text: content,
                sender: 'salon',
                timestamp: new Date().toISOString(),
                read: false,
                clientName: 'Salon Élégance'
            };
            
            messages.push(testMessage);
            
            // Sauvegarder localement
            const localMessages = JSON.parse(localStorage.getItem('messages') || '[]');
            localMessages.push(testMessage);
            localStorage.setItem('messages', JSON.stringify(localMessages));
            
            displayMessages();
            console.log('✅ Message de test créé:', testMessage);
        },
        
        resetForm: () => {
            resetForm();
            console.log('🔄 Formulaire réinitialisé');
        },
        
        testFirebase: async () => {
            try {
                if (!firebaseEnabled) {
                    console.log('❌ Firebase non activé');
                    return;
                }
                
                const testDoc = await db.collection('test').add({
                    test: true,
                    timestamp: new Date().toISOString()
                });
                
                console.log('✅ Test Firebase réussi:', testDoc.id);
                
                // Nettoyer le document de test
                await db.collection('test').doc(testDoc.id).delete();
                
            } catch (error) {
                console.error('❌ Erreur test Firebase:', error);
            }
        },
        
        initializeFirebaseServices: async () => {
            if (!firebaseEnabled || !db) {
                console.log('❌ Firebase non disponible');
                return;
            }
            
            try {
                console.log('🔧 Initialisation des services dans Firebase...');
                
                const defaultServices = [
                    { id: 'coupe-homme', name: 'Coupe Homme', price: 25, duration: 30 },
                    { id: 'coupe-femme', name: 'Coupe Femme', price: 45, duration: 45 },
                    { id: 'coloration', name: 'Coloration', price: 60, duration: 90 },
                    { id: 'balayage', name: 'Balayage', price: 80, duration: 120 },
                    { id: 'brushing', name: 'Brushing', price: 20, duration: 30 },
                    { id: 'soin', name: 'Soin Capillaire', price: 30, duration: 45 }
                ];
                
                const batch = db.batch();
                defaultServices.forEach(service => {
                    const serviceRef = db.collection('services').doc(service.id);
                    batch.set(serviceRef, service);
                });
                
                await batch.commit();
                console.log('✅ Services initialisés dans Firebase');
                
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation des services Firebase:', error);
            }
        },
        
        testServices: () => {
            console.log('=== TEST DES SERVICES ===');
            console.log('Services chargés:', services);
            console.log('Services loaded flag:', servicesLoaded);
            console.log('Container serviceCheckboxes:', document.getElementById('serviceCheckboxes'));
            console.log('Checkboxes créées:', document.querySelectorAll('input[name="services"]').length);
            
            // Tester la sélection de services
            const firstCheckbox = document.querySelector('input[name="services"]');
            if (firstCheckbox) {
                firstCheckbox.checked = true;
                firstCheckbox.dispatchEvent(new Event('change'));
                console.log('Premier service sélectionné pour test');
            }
            
           
        },
        
        forceDefaultServices: () => {
            console.log('🔧 Forçage des services par défaut');
            forceLoadDefaultServices();
        },
        
        reloadServices: async () => {
            console.log('🔄 Rechargement des services...');
            services = [];
            servicesLoaded = false;
            selectedServices = [];
            await loadServices();
        }
    };
}
