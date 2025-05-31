import { db, firebaseEnabled, servicesListener, showNotification, saveFormData } from './main.js';

// Variables globales
let services = [];
let servicesLoaded = false;
let selectedServices = [];
let priceUpdateTimestamp = null;

// Charger les services avec synchronisation en temps réel
async function loadServices() {
    try {
        if (servicesListener) servicesListener();
        
        if (firebaseEnabled && db) {
            servicesListener = db.collection('services').onSnapshot(snapshot => {
                if (snapshot.empty) {
                    console.log('⚠️ Collection services vide dans Firebase, chargement des services par défaut');
                    loadDefaultServices();
                } else {
                    const newServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Détecter les changements de prix
                    const pricesChanged = detectPriceChanges(services, newServices);
                    
                    services = newServices;
                    servicesLoaded = true;
                    
                    // Mettre à jour l'affichage
                    displayServices();
                    populateServiceCheckboxes();
                    
                    // Recalculer les totaux si des prix ont changé
                    if (pricesChanged && selectedServices.length > 0) {
                        updatePricingDisplay();
                        showNotification('⚡ Prix mis à jour par l\'administrateur !', 'info');
                    }
                    
                    console.log(`✅ ${services.length} services chargés depuis Firebase`);
                }
            }, error => {
                console.error('Erreur lors du chargement des services Firebase:', error);
                loadDefaultServices();
            });
            
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

// Détecter les changements de prix
function detectPriceChanges(oldServices, newServices) {
    if (!oldServices || oldServices.length === 0) return false;
    
    for (let newService of newServices) {
        const oldService = oldServices.find(s => s.id === newService.id);
        if (oldService && (oldService.price !== newService.price || oldService.duration !== newService.duration)) {
            console.log(`🔄 Prix changé pour ${newService.name}: ${oldService.price} → ${newService.price} DHS`);
            return true;
        }
    }
    return false;
}

// Mettre à jour l'affichage des prix en temps réel
function updatePricingDisplay() {
    try {
        // Mettre à jour les cartes de services
        displayServices();
        
        // Mettre à jour les checkboxes avec les nouveaux prix
        populateServiceCheckboxes();
        
        // Recalculer et afficher le total si des services sont sélectionnés
        if (selectedServices.length > 0) {
            updateSelectedServices();
            displayPricingSummary();
        }
        
        // Notifier de la mise à jour
        priceUpdateTimestamp = Date.now();
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des prix:', error);
    }
}

// Afficher un résumé des prix en temps réel
function displayPricingSummary() {
    try {
        if (selectedServices.length === 0) return;
        
        let totalPrice = 0;
        let totalDuration = 0;
        const selectedServiceDetails = [];
        
        selectedServices.forEach(serviceId => {
            const service = services.find(s => s.id === serviceId);
            if (service) {
                totalPrice += service.price;
                totalDuration += service.duration;
                selectedServiceDetails.push({
                    name: service.name,
                    price: service.price,
                    duration: service.duration
                });
            }
        });
        
        // Créer ou mettre à jour le résumé des prix
        let summaryElement = document.getElementById('pricingSummary');
        if (!summaryElement) {
            summaryElement = document.createElement('div');
            summaryElement.id = 'pricingSummary';
            summaryElement.className = 'pricing-summary';
            
            // Insérer après la section des services
            const servicesSection = document.getElementById('serviceCheckboxes');
            if (servicesSection && servicesSection.parentNode) {
                servicesSection.parentNode.insertBefore(summaryElement, servicesSection.nextSibling);
            }
        }
        
        summaryElement.innerHTML = `
            <div class="pricing-summary-content">
                <h4>📋 Résumé de votre sélection</h4>
                <div class="selected-services-list">
                    ${selectedServiceDetails.map(service => `
                        <div class="selected-service-item">
                            <span class="service-name">${service.name}</span>
                            <span class="service-details">${service.duration}min - ${service.price} DHS</span>
                        </div>
                    `).join('')}
                </div>
                <div class="pricing-total">
                    <div class="total-line">
                        <strong>⏱️ Durée totale: ${totalDuration} minutes</strong>
                    </div>
                    <div class="total-line total-price">
                        <strong>💰 Prix total: ${totalPrice} DHS</strong>
                    </div>
                </div>
                ${priceUpdateTimestamp && (Date.now() - priceUpdateTimestamp < 10000) ? 
                    '<div class="price-update-notice">⚡ Prix mis à jour en temps réel</div>' : ''
                }
            </div>
        `;
        
        // Ajouter les styles CSS si ils n'existent pas
        addPricingSummaryStyles();
        
    } catch (error) {
        console.error('Erreur lors de l\'affichage du résumé des prix:', error);
    }
}

// Ajouter les styles CSS pour le résumé des prix
function addPricingSummaryStyles() {
    if (document.getElementById('pricingSummaryStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'pricingSummaryStyles';
    style.textContent = `
        .pricing-summary {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #3498db;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.2);
            animation: slideIn 0.3s ease-out;
        }
        
        .pricing-summary h4 {
            color: #2c3e50;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .selected-services-list {
            margin-bottom: 15px;
        }
        
        .selected-service-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: white;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 4px solid #3498db;
        }
        
        .service-name {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .service-details {
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .pricing-total {
            border-top: 2px solid #dee2e6;
            padding-top: 15px;
            text-align: center;
        }
        
        .total-line {
            margin-bottom: 8px;
            font-size: 1.1rem;
        }
        
        .total-price {
            font-size: 1.3rem;
            color: #27ae60;
        }
        
        .price-update-notice {
            background: #fff3cd;
            color: #856404;
            padding: 8px 12px;
            border-radius: 8px;
            margin-top: 10px;
            text-align: center;
            font-size: 0.9rem;
            border: 1px solid #ffeaa7;
            animation: pulse 1s ease-in-out;
        }
        
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }
    `;
    document.head.appendChild(style);
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

// Forcer le chargement des services par défaut
function forceLoadDefaultServices() {
    console.log('🔧 Forçage des services par défaut');
    if (servicesListener) servicesListener();
    services = [];
    servicesLoaded = false;
    loadDefaultServices();
}

// Afficher les services avec indicateur de prix en temps réel
function displayServices() {
    try {
        const container = document.getElementById('servicesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            
            // Ajouter un indicateur si le prix a été récemment mis à jour
            const isRecent = priceUpdateTimestamp && (Date.now() - priceUpdateTimestamp < 5000);
            
            card.innerHTML = `
                <h3>${service.name} ${isRecent ? '<span class="price-updated">⚡</span>' : ''}</h3>
                <p>Durée : ${service.duration} min</p>
                <p class="service-price ${isRecent ? 'price-highlight' : ''}">${service.price} dhs</p>
            `;
            container.appendChild(card);
        });
        
        // Ajouter les styles pour les indicateurs de mise à jour
        addPriceUpdateStyles();
    } catch (error) {
        console.error('Erreur lors de l\'affichage des services:', error);
    }
}

// Ajouter les styles pour les indicateurs de mise à jour de prix
function addPriceUpdateStyles() {
    if (document.getElementById('priceUpdateStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'priceUpdateStyles';
    style.textContent = `
        .price-updated {
            color: #f39c12;
            animation: sparkle 1s ease-in-out;
        }
        
        .price-highlight {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white !important;
            padding: 5px 10px;
            border-radius: 20px;
            font-weight: bold;
            animation: priceGlow 2s ease-in-out;
        }
        
        @keyframes sparkle {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        @keyframes priceGlow {
            0% { box-shadow: 0 0 5px rgba(243, 156, 18, 0.5); }
            50% { box-shadow: 0 0 20px rgba(243, 156, 18, 0.8); }
            100% { box-shadow: 0 0 5px rgba(243, 156, 18, 0.5); }
        }
    `;
    document.head.appendChild(style);
}

// Remplir les cases à cocher des services avec prix en temps réel
function populateServiceCheckboxes() {
    try {
        const container = document.getElementById('serviceCheckboxes');
        if (!container) {
            console.warn('Container serviceCheckboxes non trouvé');
            return;
        }
        
        if (!services || services.length === 0) {
            console.warn('Aucun service disponible pour créer les checkboxes');
            return;
        }
        
        // Sauvegarder l'état des checkboxes sélectionnées
        const previouslySelected = [];
        container.querySelectorAll('input[name="services"]:checked').forEach(cb => {
            previouslySelected.push(cb.value);
        });
        
        container.innerHTML = '';
        console.log('Création des checkboxes pour', services.length, 'services');
        
        services.forEach((service, index) => {
            const div = document.createElement('div');
            div.className = 'checkbox-container';
            
            // Vérifier si ce service était précédemment sélectionné
            const wasSelected = previouslySelected.includes(service.id);
            
            div.innerHTML = `
                <input type="checkbox" id="service_${service.id}" name="services" value="${service.id}" ${wasSelected ? 'checked' : ''}>
                <label for="service_${service.id}">${service.name} (${service.price} dhs - ${service.duration}min)</label>
            `;
            container.appendChild(div);
            
            const checkbox = div.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    console.log('Checkbox changé:', service.name, this.checked);
                    updateSelectedServices();
                    validateField('services');
                    saveFormData();
                    
                    // Mettre à jour le résumé des prix
                    if (selectedServices.length > 0) {
                        displayPricingSummary();
                    } else {
                        removePricingSummary();
                    }
                });
            }
        });
        
        // Restaurer les sélections et mettre à jour les totaux
        if (previouslySelected.length > 0) {
            updateSelectedServices();
            displayPricingSummary();
        }
        
        console.log('✅ Cases à cocher des services créées avec événements');
        
        const createdCheckboxes = container.querySelectorAll('input[name="services"]');
        console.log('Checkboxes créées:', createdCheckboxes.length);
        
    } catch (error) {
        console.error('Erreur lors du remplissage des services:', error);
    }
}

// Supprimer le résumé des prix
function removePricingSummary() {
    const summaryElement = document.getElementById('pricingSummary');
    if (summaryElement) {
        summaryElement.remove();
    }
}

// Mettre à jour les services sélectionnés avec calcul en temps réel
function updateSelectedServices() {
    try {
        const checkboxes = document.querySelectorAll('input[name="services"]:checked');
        selectedServices.length = 0; // Vider le tableau
        checkboxes.forEach(cb => selectedServices.push(cb.value));
        
        // Mettre à jour la variable globale
        window.selectedServices = selectedServices;
        
        console.log('Services mis à jour:', selectedServices);
        
        // Si des services sont sélectionnés, calculer et afficher le total
        if (selectedServices.length > 0) {
            displayPricingSummary();
        } else {
            removePricingSummary();
        }
        
        return selectedServices;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des services sélectionnés:', error);
        return [];
    }
}

// Fonction pour obtenir le prix total actuel
function getCurrentTotalPrice() {
    let total = 0;
    selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            total += service.price;
        }
    });
    return total;
}

// Fonction pour obtenir la durée totale actuelle
function getCurrentTotalDuration() {
    let total = 0;
    selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            total += service.duration;
        }
    });
    return total;
}

// Validation des services
function validateField(fieldId) {
    try {
        let isValid = true;
        const errorElement = document.getElementById(`${fieldId}Error`);
        
        if (!errorElement) return true;

        if (fieldId === 'services') {
            const currentSelectedServices = updateSelectedServices();
            if (currentSelectedServices.length === 0) {
                showFieldError(errorElement, 'Veuillez sélectionner au moins un service.');
                isValid = false;
            } else {
                hideFieldError(errorElement);
            }
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
        errorElement.style.color = '#e74c3c';
    }
}

function hideFieldError(errorElement) {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Fonction pour notifier les changements de prix aux autres modules
function notifyPriceChange() {
    // Émettre un événement personnalisé pour notifier les autres modules
    const event = new CustomEvent('pricesUpdated', {
        detail: {
            services: services,
            timestamp: Date.now()
        }
    });
    document.dispatchEvent(event);
}

// Écouter les événements de changement de prix
document.addEventListener('pricesUpdated', (event) => {
    console.log('🔄 Prix mis à jour reçu:', event.detail);
    if (selectedServices.length > 0) {
        displayPricingSummary();
    }
});

// Rendre les fonctions disponibles globalement
window.updateSelectedServices = updateSelectedServices;
window.getCurrentTotalPrice = getCurrentTotalPrice;
window.getCurrentTotalDuration = getCurrentTotalDuration;

export { 
    loadServices, 
    forceLoadDefaultServices, 
    services, 
    servicesLoaded, 
    selectedServices, 
    updateSelectedServices,
    validateField,
    getCurrentTotalPrice,
    getCurrentTotalDuration,
    displayPricingSummary
};