// admin_appointments_messages.js - Gestion des rendez-vous, messages et administration

// Configurer les écouteurs d'événements
function setupEventListeners() {
    try {
        const messageInput = document.getElementById('adminMessageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAdminMessage();
                }
            });
        }
        console.log('✅ Écouteurs d\'événements configurés');
    } catch (error) {
        console.error('Erreur configuration écouteurs:', error);
    }
}

// Mettre à jour les statistiques
function updateStatistics() {
    try {
        const totalAppointments = appointments.length;
        const pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
        const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed').length;
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(apt => apt.date === today).length;
        const totalRevenue = appointments
            .filter(apt => apt.status === 'confirmed')
            .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);

        const elements = {
            'totalAppointments': totalAppointments,
            'pendingAppointments': pendingAppointments,
            'confirmedAppointments': confirmedAppointments,
            'todayAppointments': todayAppointments,
            'totalRevenue': `${totalRevenue} DHS`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    } catch (error) {
        console.error('Erreur mise à jour statistiques:', error);
    }
}

// Mettre à jour la navigation active
function updateActiveNav(title) {
    try {
        const sectionTitle = document.getElementById('sectionTitle');
        if (sectionTitle) {
            sectionTitle.textContent = title;
        }
        document.querySelectorAll('.admin-nav a').forEach(link => {
            link.classList.remove('active');
        });
    } catch (error) {
        console.error('Erreur mise à jour navigation:', error);
    }
}

// Afficher tous les rendez-vous
function showAllAppointments() {
    currentFilter = 'all';
    updateActiveNav('📊 Tous les rendez-vous');
    showAppointmentsSection();
    displayAppointments();
}

// Afficher les rendez-vous en attente
function showPendingAppointments() {
    currentFilter = 'pending';
    updateActiveNav('⏳ Rendez-vous en attente');
    showAppointmentsSection();
    displayAppointments();
}

// Afficher les rendez-vous confirmés
function showConfirmedAppointments() {
    currentFilter = 'confirmed';
    updateActiveNav('✅ Rendez-vous confirmés');
    showAppointmentsSection();
    displayAppointments();
}

// Afficher les rendez-vous annulés
function showCancelledAppointments() {
    currentFilter = 'cancelled';
    updateActiveNav('❌ Rendez-vous annulés');
    showAppointmentsSection();
    displayAppointments();
}

// Afficher les rendez-vous d'aujourd'hui
function showTodayAppointments() {
    currentFilter = 'today';
    updateActiveNav('📆 Rendez-vous d\'aujourd\'hui');
    showAppointmentsSection();
    displayAppointments();
}

// Afficher la section messages
function showMessages() {
    updateActiveNav('💬 Messages');
    hideAllMainSections();
    const messagesSection = document.getElementById('messagesSection');
    if (messagesSection) {
        messagesSection.style.display = 'block';
        displayConversations();
    }
}

// Afficher la section des rendez-vous
function showAppointmentsSection() {
    hideAllMainSections();
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    if (appointmentsContainer) {
        appointmentsContainer.style.display = 'grid';
    }
}

// Cacher toutes les sections principales
function hideAllMainSections() {
    const sectionsToHide = ['appointmentsContainer', 'messagesSection', 'priceManagerSection'];
    sectionsToHide.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

// Afficher les rendez-vous
function displayAppointments() {
    try {
        const container = document.getElementById('appointmentsContainer');
        if (!container) {
            console.error('❌ Conteneur rendez-vous non trouvé');
            return;
        }

        let filteredAppointments = [...appointments];

        // Appliquer le filtre principal
        if (currentFilter !== 'all') {
            if (currentFilter === 'today') {
                const today = new Date().toISOString().split('T')[0];
                filteredAppointments = filteredAppointments.filter(apt => apt.date === today);
            } else {
                filteredAppointments = filteredAppointments.filter(apt => apt.status === currentFilter);
            }
        }

        // Appliquer les filtres supplémentaires
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const filterDate = document.getElementById('filterDate')?.value || '';
        const filterStatus = document.getElementById('filterStatus')?.value || 'all';
        const filterService = document.getElementById('filterService')?.value || '';
        const filterStylist = document.getElementById('filterStylist')?.value || '';

        if (searchTerm) {
            filteredAppointments = filteredAppointments.filter(apt =>
                (apt.clientName || '').toLowerCase().includes(searchTerm) ||
                (apt.clientPhone || '').toLowerCase().includes(searchTerm)
            );
        }

        if (filterDate) {
            filteredAppointments = filteredAppointments.filter(apt => apt.date === filterDate);
        }

        if (filterStatus !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => apt.status === filterStatus);
        }

        if (filterService) {
            filteredAppointments = filteredAppointments.filter(apt =>
                apt.services && apt.services.includes(filterService)
            );
        }

        if (filterStylist) {
            filteredAppointments = filteredAppointments.filter(apt => apt.stylist === filterStylist);
        }

        container.innerHTML = '';

        if (!filteredAppointments.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📭 Aucun rendez-vous trouvé</h3>
                    <p>Aucun rendez-vous ne correspond aux critères sélectionnés.</p>
                </div>
            `;
            return;
        }

        filteredAppointments.forEach(appointment => {
            const card = createAppointmentCard(appointment);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur affichage rendez-vous:', error);
        showNotification('❌ Erreur lors de l\'affichage des rendez-vous', 'error');
    }
}

// Créer une carte de rendez-vous
function createAppointmentCard(appointment) {
    try {
        const card = document.createElement('div');
        card.className = `appointment-card status-${appointment.status || 'pending'}`;

        const servicesNames = appointment.services?.length
            ? appointment.services.map(serviceId => {
                  const service = services.find(s => s.id === serviceId);
                  return service ? service.name : serviceId;
              }).join(', ')
            : 'Non spécifié';

        card.innerHTML = `
            <div class="appointment-info">
                <div><strong>Client:</strong> ${appointment.clientName || 'Non spécifié'}</div>
                <div><strong>Téléphone:</strong> ${appointment.clientPhone || 'Non spécifié'}</div>
                ${appointment.clientEmail ? `<div><strong>Email:</strong> ${appointment.clientEmail}</div>` : ''}
                <div><strong>Services:</strong> ${servicesNames}</div>
                <div><strong>Coiffeur:</strong> ${appointment.stylist || 'Non spécifié'}</div>
                <div><strong>Date:</strong> ${formatDate(appointment.date)}</div>
                <div><strong>Heure:</strong> ${appointment.time || 'Non spécifié'}</div>
                <div><strong>Durée:</strong> ${appointment.totalDuration || 'Non spécifié'} min</div>
                <div><strong>Prix:</strong> ${appointment.totalPrice || 0} DHS</div>
                <div><strong>Statut:</strong> <span class="status-badge status-${appointment.status || 'pending'}">${getStatusText(appointment.status)}</span></div>
                ${appointment.notes ? `<div><strong>Notes:</strong> ${appointment.notes}</div>` : ''}
                <div><strong>Créé le:</strong> ${formatDateTime(appointment.createdAt)}</div>
            </div>
            <div class="appointment-actions">
                ${appointment.status === 'pending' ? `
                    <button class="btn btn-success btn-small" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">✅ Confirmer</button>
                    <button class="btn btn-danger btn-small" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">❌ Annuler</button>
                ` : ''}
                ${appointment.status === 'confirmed' ? `
                    <button class="btn btn-danger btn-small" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">❌ Annuler</button>
                ` : ''}
                ${appointment.status === 'cancelled' ? `
                    <button class="btn btn-success btn-small" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">✅ Réactiver</button>
                ` : ''}
                <button class="btn btn-secondary btn-small" onclick="deleteAppointment('${appointment.id}')">🗑️ Supprimer</button>
            </div>
        `;

        return card;
    } catch (error) {
        console.error('Erreur création carte rendez-vous:', error);
        return document.createElement('div');
    }
}

// Mettre à jour le statut d'un rendez-vous
async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            showNotification('❌ Rendez-vous non trouvé', 'error');
            return;
        }

        if (firebaseEnabled && db) {
            await db.collection('appointments').doc(appointmentId).update({
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
        } else {
            const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
            if (appointmentIndex !== -1) {
                appointments[appointmentIndex].status = newStatus;
                appointments[appointmentIndex].updatedAt = new Date().toISOString();
                localStorage.setItem('appointments', JSON.stringify(appointments));
                displayAppointments();
                updateStatistics();
            }
        }

        showNotification(`✅ Rendez-vous ${getStatusText(newStatus).toLowerCase()} avec succès !`, 'success');
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        showNotification('❌ Erreur lors de la mise à jour du statut', 'error');
    }
}

// Supprimer un rendez-vous
async function deleteAppointment(appointmentId) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) return;

    try {
        if (firebaseEnabled && db) {
            await db.collection('appointments').doc(appointmentId).delete();
        } else {
            const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
            if (appointmentIndex !== -1) {
                appointments.splice(appointmentIndex, 1);
                localStorage.setItem('appointments', JSON.stringify(appointments));
                displayAppointments();
                updateStatistics();
            }
        }

        showNotification('✅ Rendez-vous supprimé avec succès !', 'success');
    } catch (error) {
        console.error('Erreur suppression rendez-vous:', error);
        showNotification('❌ Erreur lors de la suppression', 'error');
    }
}

// Filtrer les rendez-vous
function filterAppointments() {
    displayAppointments();
}

// Réinitialiser la recherche
function clearSearch() {
    try {
        const inputs = ['searchInput', 'filterDate', 'filterService', 'filterStylist'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) input.value = '';
        });

        const statusFilter = document.getElementById('filterStatus');
        if (statusFilter) statusFilter.value = 'all';

        displayAppointments();
    } catch (error) {
        console.error('Erreur réinitialisation recherche:', error);
    }
}

// Afficher les conversations
function displayConversations() {
    try {
        const container = document.getElementById('conversationsList');
        if (!container) {
            console.error('❌ Conteneur conversations non trouvé');
            return;
        }

        const conversations = {};
        messages.forEach(msg => {
            if (!conversations[msg.phone]) {
                conversations[msg.phone] = {
                    phone: msg.phone,
                    clientName: msg.clientName || 'Client',
                    messages: [],
                    lastMessage: null,
                    unreadCount: 0
                };
            }
            conversations[msg.phone].messages.push(msg);
            if (!msg.read && msg.sender === 'client') {
                conversations[msg.phone].unreadCount++;
            }
        });

        Object.values(conversations).forEach(conv => {
            conv.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            conv.lastMessage = conv.messages[0];
        });

        const sortedConversations = Object.values(conversations)
            .sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

        container.innerHTML = '';

        if (!sortedConversations.length) {
            container.innerHTML = '<div class="empty-messages"><h3>💬 Aucun message</h3><p>Aucune conversation pour le moment.</p></div>';
            return;
        }

        sortedConversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            if (currentConversation === conv.phone) {
                item.classList.add('active');
            }

            item.innerHTML = `
                <div class="conversation-phone">${conv.phone}</div>
                <div class="conversation-preview">${conv.lastMessage?.text || 'Aucun message'}</div>
                <div class="conversation-time">${formatDateTime(conv.lastMessage?.timestamp)}</div>
                ${conv.unreadCount > 0 ? `<div class="conversation-unread">${conv.unreadCount}</div>` : ''}
            `;

            item.addEventListener('click', () => openConversation(conv.phone, conv.clientName));
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Erreur affichage conversations:', error);
        showNotification('❌ Erreur lors de l\'affichage des conversations', 'error');
    }
}

// Ouvrir une conversation
function openConversation(phone, clientName) {
    try {
        currentConversation = phone;
        const chatClientName = document.getElementById('chatClientName');
        const chatClientPhone = document.getElementById('chatClientPhone');
        const chatArea = document.getElementById('chatArea');

        if (chatClientName) chatClientName.textContent = clientName || 'Client';
        if (chatClientPhone) chatClientPhone.textContent = phone;
        if (chatArea) chatArea.style.display = 'flex';

        displayConversationMessages();
        displayConversations();
        markMessagesAsRead(phone);
    } catch (error) {
        console.error('Erreur ouverture conversation:', error);
    }
}

// Afficher les messages d'une conversation
function displayConversationMessages() {
    try {
        const container = document.getElementById('adminMessages');
        if (!container || !currentConversation) {
            console.error('❌ Conteneur messages ou conversation non défini');
            return;
        }

        const conversationMessages = messages
            .filter(msg => msg.phone === currentConversation)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        container.innerHTML = '';

        if (!conversationMessages.length) {
            container.innerHTML = '<div class="empty-messages"><p>💬 Aucun message dans cette conversation.</p></div>';
            return;
        }

        conversationMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender}`;
            messageDiv.innerHTML = `
                <div>${msg.text}</div>
                <div class="message-time">${formatDateTime(msg.timestamp)}</div>
            `;
            container.appendChild(messageDiv);
        });

        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Erreur affichage messages conversation:', error);
        showNotification('❌ Erreur lors de l\'affichage des messages', 'error');
    }
}

// Envoyer un message admin
async function sendAdminMessage() {
    try {
        const messageInput = document.getElementById('adminMessageInput');
        if (!messageInput || !currentConversation) return;

        const messageText = messageInput.value.trim();
        if (!messageText) return;

        const message = {
            phone: currentConversation,
            text: messageText,
            sender: 'salon',
            timestamp: new Date().toISOString(),
            read: true
        };

        if (firebaseEnabled && db) {
            await db.collection('messages').add(message);
        } else {
            messages.unshift({ ...message, id: `local_${Date.now()}` });
            localStorage.setItem('messages', JSON.stringify(messages));
            displayConversationMessages();
            displayConversations();
        }

        messageInput.value = '';
        showNotification('✅ Message envoyé !', 'success');
    } catch (error) {
        console.error('Erreur envoi message:', error);
        showNotification('❌ Erreur lors de l\'envoi du message', 'error');
    }
}

// Marquer les messages comme lus
async function markMessagesAsRead(phone) {
    try {
        const unreadMessages = messages.filter(msg =>
            msg.phone === phone && msg.sender === 'client' && !msg.read
        );

        if (firebaseEnabled && db) {
            const batch = db.batch();
            unreadMessages.forEach(msg => {
                if (msg.id && !msg.id.startsWith('local_')) {
                    const msgRef = db.collection('messages').doc(msg.id);
                    batch.update(msgRef, { read: true });
                }
            });
            await batch.commit();
        } else {
            unreadMessages.forEach(msg => {
                msg.read = true;
            });
            localStorage.setItem('messages', JSON.stringify(messages));
            displayConversations();
        }
    } catch (error) {
        console.error('Erreur marquage messages lus:', error);
    }
}

// Fermer la conversation
function closeChat() {
    try {
        currentConversation = null;
        const chatArea = document.getElementById('chatArea');
        if (chatArea) chatArea.style.display = 'none';
        displayConversations();
    } catch (error) {
        console.error('Erreur fermeture chat:', error);
    }
}

// Afficher/masquer le formulaire de mot de passe
function togglePasswordForm() {
    try {
        const form = document.getElementById('passwordForm');
        if (form) {
            form.classList.toggle('active');
        }
    } catch (error) {
        console.error('Erreur affichage formulaire mot de passe:', error);
    }
}

// Changer le mot de passe
function changePassword() {
    try {
        const newPassword = document.getElementById('newPasswordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;
        const errorElement = document.getElementById('changePasswordError');

        if (!newPassword || newPassword.length < 6) {
            if (errorElement) {
                errorElement.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
                errorElement.style.display = 'block';
            }
            return;
        }

        if (newPassword !== confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'Les mots de passe ne correspondent pas.';
                errorElement.style.display = 'block';
            }
            return;
        }

        console.warn('⚠️ Le mot de passe est stocké en clair dans localStorage. Envisagez d\'utiliser Firebase Auth ou un hachage sécurisé.');
        ADMIN_PASSWORD = newPassword;
        localStorage.setItem('adminPassword', newPassword);

        document.getElementById('newPasswordInput').value = '';
        document.getElementById('confirmPasswordInput').value = '';
        if (errorElement) errorElement.style.display = 'none';
        togglePasswordForm();
        showNotification('🔐 Mot de passe modifié avec succès !', 'success');
    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        showNotification('❌ Erreur lors du changement de mot de passe', 'error');
    }
}

// Afficher/masquer le formulaire de plannings
function toggleSchedulesForm() {
    try {
        const form = document.getElementById('schedulesForm');
        if (form) {
            form.classList.toggle('active');
            if (form.classList.contains('active')) {
                displaySchedulesForm();
            }
        }
    } catch (error) {
        console.error('Erreur affichage formulaire plannings:', error);
    }
}

// Afficher le formulaire de plannings
function displaySchedulesForm() {
    try {
        const container = document.getElementById('schedulesList');
        if (!container) {
            console.error('❌ Conteneur plannings non trouvé');
            return;
        }

        const stylists = ['Brahim', 'Ali', 'Mohamed'];
        container.innerHTML = '';

        stylists.forEach(stylist => {
            const schedule = schedules.find(s => s.stylistId === stylist) || {
                stylistId: stylist,
                dates: []
            };

            const item = document.createElement('div');
            item.className = 'schedule-item';
            item.innerHTML = `
                <div class="schedule-stylist">${stylist}</div>
                <label>Date:</label>
                <input type="date" id="date_${stylist}" min="${new Date().toISOString().split('T')[0]}">
                <label>Heure de début:</label>
                <input type="time" id="start_${stylist}" value="09:00">
                <label>Heure de fin:</label>
                <input type="time" id="end_${stylist}" value="18:00">
                <button class="btn btn-small" onclick="addScheduleDate('${stylist}')">Ajouter cette date</button>
                <div id="dates_${stylist}"></div>
            `;
            container.appendChild(item);

            displayExistingDates(stylist, schedule.dates || []);
        });
    } catch (error) {
        console.error('Erreur affichage formulaire plannings:', error);
    }
}

// Afficher les dates existantes
function displayExistingDates(stylist, dates) {
    try {
        const container = document.getElementById(`dates_${stylist}`);
        if (!container) return;

        container.innerHTML = '<h5>Dates planifiées:</h5>';
        dates.forEach((dateInfo, index) => {
            const dateDiv = document.createElement('div');
            dateDiv.style.cssText = 'margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;';
            dateDiv.innerHTML = `
                <strong>${dateInfo.date}</strong> - ${dateInfo.start} à ${dateInfo.end}
                <button class="btn btn-danger btn-small" style="margin-left: 10px;" onclick="removeScheduleDate('${stylist}', ${index})">Supprimer</button>
            `;
            container.appendChild(dateDiv);
        });
    } catch (error) {
        console.error('Erreur affichage dates existantes:', error);
    }
}

// Ajouter une date de planning
function addScheduleDate(stylist) {
    try {
        const date = document.getElementById(`date_${stylist}`)?.value;
        const start = document.getElementById(`start_${stylist}`)?.value;
        const end = document.getElementById(`end_${stylist}`)?.value;

        if (!date || !start || !end) {
            showNotification('❌ Veuillez remplir tous les champs', 'error');
            return;
        }

        if (start >= end) {
            showNotification('❌ L\'heure de fin doit être après l\'heure de début', 'error');
            return;
        }

        let schedule = schedules.find(s => s.stylistId === stylist);
        if (!schedule) {
            schedule = { stylistId: stylist, dates: [] };
            schedules.push(schedule);
        }

        const existingDateIndex = schedule.dates.findIndex(d => d.date === date);
        if (existingDateIndex !== -1) {
            schedule.dates[existingDateIndex] = { date, start, end };
        } else {
            schedule.dates.push({ date, start, end });
        }

        schedule.dates.sort((a, b) => new Date(a.date) - new Date(b.date));

        displayExistingDates(stylist, schedule.dates);
        showNotification('✅ Date ajoutée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur ajout date:', error);
        showNotification('❌ Erreur lors de l\'ajout de la date', 'error');
    }
}

// Supprimer une date de planning
function removeScheduleDate(stylist, dateIndex) {
    try {
        const schedule = schedules.find(s => s.stylistId === stylist);
        if (schedule && schedule.dates[dateIndex]) {
            schedule.dates.splice(dateIndex, 1);
            displayExistingDates(stylist, schedule.dates);
            showNotification('✅ Date supprimée avec succès !', 'success');
        }
    } catch (error) {
        console.error('Erreur suppression date:', error);
        showNotification('❌ Erreur lors de la suppression de la date', 'error');
    }
}

// Sauvegarder les plannings
async function saveSchedules() {
    try {
        if (firebaseEnabled && db) {
            const batch = db.batch();
            schedules.forEach(schedule => {
                const scheduleRef = db.collection('schedules').doc(schedule.stylistId);
                batch.set(scheduleRef, schedule);
            });
            await batch.commit();
        } else {
            localStorage.setItem('schedules', JSON.stringify(schedules));
        }

        toggleSchedulesForm();
        showNotification('📅 Plannings sauvegardés avec succès !', 'success');
    } catch (error) {
        console.error('Erreur sauvegarde plannings:', error);
        showNotification('❌ Erreur lors de la sauvegarde des plannings', 'error');
    }
}

// Exporter les données
function exportData() {
    try {
        const data = {
            appointments,
            services,
            schedules,
            messages,
            priceHistory: priceUpdateHistory,
            exportDate: new Date().toISOString(),
            exportedBy: 'admin'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `salon_elegance_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('📊 Données exportées avec succès !', 'success');
    } catch (error) {
        console.error('Erreur exportation:', error);
        showNotification('❌ Erreur lors de l\'exportation des données', 'error');
    }
}

// Importer les données
function importData(input) {
    try {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = async function (e) {
            try {
                const data = JSON.parse(e.target.result);

                if (!confirm('⚠️ Êtes-vous sûr de vouloir importer ces données ? Cela remplacera toutes les données existantes.')) {
                    return;
                }

                if (firebaseEnabled && db) {
                    const batch = db.batch();

                    if (data.appointments) {
                        data.appointments.forEach(apt => {
                            const aptRef = db.collection('appointments').doc(apt.id);
                            batch.set(aptRef, apt);
                        });
                    }

                    if (data.services) {
                        data.services.forEach(service => {
                            const serviceRef = db.collection('services').doc(service.id);
                            batch.set(serviceRef, service);
                        });
                    }

                    if (data.schedules) {
                        data.schedules.forEach(schedule => {
                            const scheduleRef = db.collection('schedules').doc(schedule.stylistId);
                            batch.set(scheduleRef, schedule);
                        });
                    }

                    if (data.messages) {
                        data.messages.forEach(msg => {
                            const msgRef = db.collection('messages').doc(msg.id || `imported_${Date.now()}_${Math.random()}`);
                            batch.set(msgRef, msg);
                        });
                    }

                    await batch.commit();
                } else {
                    if (data.appointments) {
                        localStorage.setItem('appointments', JSON.stringify(data.appointments));
                        appointments = data.appointments;
                    }
                    if (data.services) {
                        localStorage.setItem('services', JSON.stringify(data.services));
                        services = data.services;
                    }
                    if (data.schedules) {
                        localStorage.setItem('schedules', JSON.stringify(data.schedules));
                        schedules = data.schedules;
                    }
                    if (data.messages) {
                        localStorage.setItem('messages', JSON.stringify(data.messages));
                        messages = data.messages;
                    }
                    if (data.priceHistory) {
                        localStorage.setItem('priceUpdateHistory', JSON.stringify(data.priceHistory));
                        priceUpdateHistory = data.priceHistory;
                    }

                    displayAppointments();
                    displayConversations();
                    updateStatistics();
                    refreshPriceManagerIfOpen();
                }

                showNotification('📁 Données importées avec succès !', 'success');
                input.value = '';
            } catch (error) {
                console.error('Erreur importation:', error);
                showNotification('❌ Erreur lors de l\'importation. Vérifiez le format du fichier', 'error');
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('Erreur lecture fichier:', error);
        showNotification('❌ Erreur lors de la lecture du fichier', 'error');
    }
}

// Tester la connexion Firebase
async function testFirebaseConnection() {
    try {
        if (!firebaseEnabled) {
            showNotification('❌ Firebase n\'est pas activé', 'error');
            return;
        }

        const testDoc = {
            test: true,
            timestamp: new Date().toISOString()
        };

        await db.collection('test').doc('connectionTest').set(testDoc);
        showNotification('✅ Connexion Firebase testée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur test Firebase:', error);
        showNotification('❌ Erreur lors du test de connexion Firebase', 'error');
    }
}

// Nettoyer les listeners
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

// Exposer les fonctions nécessaires
window.showAllAppointments = showAllAppointments;
window.showPendingAppointments = showPendingAppointments;
window.showConfirmedAppointments = showConfirmedAppointments;
window.showCancelledAppointments = showCancelledAppointments;
window.showTodayAppointments = showTodayAppointments;
window.showMessages = showMessages;
window.updateAppointmentStatus = updateAppointmentStatus;
window.deleteAppointment = deleteAppointment;
window.filterAppointments = filterAppointments;
window.clearSearch = clearSearch;
window.openConversation = openConversation;
window.sendAdminMessage = sendAdminMessage;
window.closeChat = closeChat;
window.togglePasswordForm = togglePasswordForm;
window.changePassword = changePassword;
window.toggleSchedulesForm = toggleSchedulesForm;
window.addScheduleDate = addScheduleDate;
window.removeScheduleDate = removeScheduleDate;
window.saveSchedules = saveSchedules;
window.exportData = exportData;
window.importData = importData;
window.testFirebaseConnection = testFirebaseConnection;