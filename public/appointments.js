import { db, firebaseEnabled, schedulesListener, appointmentsListener, clientPhone, showNotification, saveFormData } from './main.js';
import { services, selectedServices, updateSelectedServices } from './services.js';
import { loadMessagesForClient } from './messages.js';

// Variables globales
let schedules = [];
let appointments = [];
let selectedTime = '';
let selectedStylist = '';
let currentClientPhone = '';

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
            const stylists = ['Brahim', 'Ali', 'Mohamed'];
            const today = new Date();
            
            stylists.forEach(stylist => {
                const dates = [];
                for (let i = 0; i < 30; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    const dateString = date.toISOString().split('T')[0];
                    
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

// Configurer le formulaire de rendez-vous
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

        if (dateInput) {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            dateInput.min = todayString;
            
            if (!dateInput.value) {
                dateInput.value = todayString;
            }
            
            dateInput.addEventListener('change', function() {
                console.log('📅 Date changée vers:', this.value);
                selectedTime = '';
                if (timeSelect) timeSelect.value = '';
                updateAvailableTimes();
                saveFormData();
            });

            console.log('✅ Date configurée:', dateInput.value);
        }
        
        if (stylistSelect) {
            stylistSelect.addEventListener('change', function() {
                selectedStylist = this.value;
                console.log('👨‍💼 Coiffeur changé vers:', selectedStylist);
                selectedTime = '';
                if (timeSelect) timeSelect.value = '';
                updateAvailableTimes();
                saveFormData();
            });

            console.log('✅ Sélecteur de coiffeur configuré');
        }

        if (timeSelect) {
            timeSelect.addEventListener('change', function() {
                selectedTime = this.value;
                console.log('🕐 Heure sélectionnée:', selectedTime);
                
                if (selectedTime) {
                    hideTimeError();
                } else {
                    showTimeError('Veuillez sélectionner une heure');
                }
                
                saveFormData();
            });

            console.log('✅ Sélecteur d\'heure configuré');
        }

        setupFieldValidation();
        form.addEventListener('submit', handleFormSubmit);

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

// Mettre à jour les horaires disponibles
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

        const currentSelection = timeSelect.value;
        timeSelect.innerHTML = '<option value="">Sélectionner une heure</option>';

        if (!selectedDate) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '⚠️ Sélectionnez d\'abord une date';
            option.disabled = true;
            timeSelect.appendChild(option);
            return;
        }

        if (!selectedStylist) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '⚠️ Sélectionnez d\'abord un coiffeur';
            option.disabled = true;
            timeSelect.appendChild(option);
            return;
        }

        const slots = generateAllTimeSlots(selectedDate, selectedStylist);
        
        if (slots.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '❌ Aucun créneau disponible';
            option.disabled = true;
            timeSelect.appendChild(option);
            console.log('❌ Aucun créneau disponible');
        } else {
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

            if (currentSelection && slots.find(s => s.time === currentSelection && !s.disabled)) {
                timeSelect.value = currentSelection;
                selectedTime = currentSelection;
                console.log('✅ Sélection restaurée:', currentSelection);
            }
        }

    } catch (error) {
        console.error('❌ Erreur updateAvailableTimes:', error);
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

        if (isToday) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const slotTime = hours * 60 + minutes;
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            if (slotTime <= currentTime + 30) {
                slot.disabled = true;
                slot.status = 'passé';
            }
        }

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
                
            case 'clientPhone':
                const phoneInput = document.getElementById('clientPhone');
                if (!phoneInput?.value?.trim() || !/^\+212[5-7][0-9]{8}$/.test(phoneInput.value)) {
                    showFieldError(errorElement, 'Format téléphone invalide (+212XXXXXXXXX).');
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
        }

        return isValid;
    } catch (error) {
        console.error('Erreur lors de la validation:', error);
        return false;
    }
}

// Fonctions d'aide pour les erreurs
function showFieldError(errorElement, message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#e74c3c';
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
        updateSelectedServices();
        
        const isNameValid = validateField('clientName');
        const isPhoneValid = validateField('clientPhone');
        const isEmailValid = validateField('clientEmail');
        const areServicesValid = validateField('services');
        
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

        updateSelectedServices();
        
        console.log('Soumission - Services sélectionnés:', selectedServices);

        if (!clientName || !clientPhoneInput || !selectedServices.length || !stylist || !date || !time) {
            showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

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

        if (firebaseEnabled && db) {
            await db.collection('appointments').doc(appointment.id).set(appointment);
            console.log('✅ Rendez-vous sauvegardé dans Firebase');
        } else {
            const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            localAppointments.push(appointment);
            localStorage.setItem('appointments', JSON.stringify(localAppointments));
            console.log('✅ Rendez-vous sauvegardé localement');
        }

        // Mettre à jour le numéro de téléphone global
        localStorage.setItem('clientPhone', clientPhoneInput);

        resetForm();
        await loadMessagesForClient(clientPhoneInput);

        showNotification(`Rendez-vous soumis avec succès ! Total: ${totalPrice} dhs pour ${totalDuration} minutes. Vous recevrez une confirmation bientôt.`, 'success');
        
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
            
            const dateInput = document.getElementById('dateSelect');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            const timeSelect = document.getElementById('timeSelect');
            if (timeSelect) {
                timeSelect.innerHTML = '<option value="">Choisir une heure</option>';
            }
            
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
            
            const phoneInput = document.getElementById('clientPhone');
            const savedPhone = localStorage.getItem('clientPhone');
            if (phoneInput && savedPhone) {
                phoneInput.value = savedPhone;
            }
            
            selectedServices.length = 0;
            selectedTime = '';
            selectedStylist = '';
            
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
    displayMyAppointments(currentClientPhone);
    loadMessagesForClient(phoneNumber);
}

// Afficher mes rendez-vous
function displayMyAppointments(phoneNumber = currentClientPhone) {
    const clientAppointments = appointments.filter(apt => 
        apt.clientPhone.replace(/\s/g, '') === phoneNumber.replace(/\s/g, '')
    );

    const container = document.getElementById('myAppointments');
    if (!container) return;
    
    container.innerHTML = '';

    if (clientAppointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Aucun rendez-vous trouvé</h3><p>Aucun rendez-vous trouvé pour ce numéro.</p></div>';
        return;
    }

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
            const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            const updatedAppointments = localAppointments.map(apt => 
                apt.id === appointmentId ? {...apt, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'client'} : apt
            );
            localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
            
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

// Rendre les fonctions disponibles globalement pour l'HTML
window.searchMyAppointments = searchMyAppointments;
window.cancelMyAppointment = cancelMyAppointment;
window.updateAvailableTimes = updateAvailableTimes;
window.selectedServices = selectedServices;
window.selectedStylist = selectedStylist;
window.selectedTime = selectedTime;

export { 
    loadSchedules, 
    loadAppointments, 
    setupAppointmentForm, 
    schedules, 
    appointments, 
    selectedTime, 
    selectedStylist,
    displayMyAppointments,
    searchMyAppointments,
    updateAvailableTimes
};