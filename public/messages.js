import { db, firebaseEnabled, messagesListener, showNotification } from './main.js';

// Variables globales
let messages = [];
let currentClientPhone = '';

// Charger les messages pour un client
async function loadMessagesForClient(phoneNumber) {
    try {
        if (!phoneNumber) return;
        
        currentClientPhone = phoneNumber;
        localStorage.setItem('clientPhone', phoneNumber);

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

        let clientPhoneNumber = currentClientPhone;
        
        // Si pas de numéro de téléphone courant, essayer de le récupérer du formulaire
        if (!clientPhoneNumber) {
            const phoneInput = document.getElementById('clientPhone');
            if (phoneInput?.value && /^\+212[5-7][0-9]{8}$/.test(phoneInput.value)) {
                clientPhoneNumber = phoneInput.value;
                currentClientPhone = clientPhoneNumber;
                localStorage.setItem('clientPhone', clientPhoneNumber);
            } else {
                showNotification('Veuillez d\'abord remplir le formulaire de rendez-vous avec un numéro de téléphone valide.', 'error');
                return;
            }
        }

        const clientName = document.getElementById('clientName')?.value?.trim() || 'Client';

        const message = {
            phone: clientPhoneNumber,
            text: messageText,
            sender: 'client',
            timestamp: new Date().toISOString(),
            read: false,
            clientName: clientName
        };

        if (firebaseEnabled && db) {
            await db.collection('messages').add(message);
            console.log('✅ Message envoyé via Firebase');
        } else {
            const allMessages = JSON.parse(localStorage.getItem('messages') || '[]');
            const messageWithId = { ...message, id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
            allMessages.push(messageWithId);
            localStorage.setItem('messages', JSON.stringify(allMessages));
            
            messages.push(messageWithId);
            displayMessages();
            console.log('✅ Message sauvegardé localement');
        }

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
        if (!messageInput) {
            console.warn('Input de message client non trouvé');
            return;
        }

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendClientMessage();
            }
        });

        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        console.log('✅ Entrée de message configurée');
    } catch (error) {
        console.error('Erreur lors de la configuration de l\'entrée de message:', error);
    }
}

// Fonction utilitaire
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

// Rendre la fonction globale pour l'HTML
window.sendClientMessage = sendClientMessage;

export { 
    loadMessagesForClient, 
    setupMessageInput, 
    messages, 
    currentClientPhone,
    sendClientMessage 
};