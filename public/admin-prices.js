// admin_prices.js - Gestion des prix et services

function initializePriceManager() {
    console.log('💰 Initialisation gestionnaire de prix...');
    loadPriceHistory();
    addPriceManagerStyles();
    console.log('✅ Gestionnaire de prix prêt');
}

function showPriceManager() {
    console.log('🎯 Ouverture gestionnaire de prix');
    hideAllMainSections();
    
    let priceSection = document.getElementById('priceManagerSection');
    if (!priceSection) {
        priceSection = document.createElement('div');
        priceSection.id = 'priceManagerSection';
        priceSection.className = 'price-manager-section';
        
        const content = document.querySelector('.content');
        if (content) {
            content.appendChild(priceSection);
        } else {
            console.error('❌ Content container non trouvé');
            return;
        }
    }
    
    priceSection.style.display = 'block';
    updateActiveNav('💰 Gestionnaire de Prix');
    
    setTimeout(() => {
        renderPriceManager();
    }, 200);
}

function renderPriceManager() {
    console.log('🎨 Rendu interface gestionnaire...');
    const container = document.getElementById('priceManagerSection');
    if (!container) {
        console.error('❌ Container gestionnaire non trouvé');
        return;
    }
    
    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="price-manager-container">
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 15px;">
                    <h3 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Services en cours de chargement</h3>
                    <p style="color: #6c757d; margin-bottom: 30px;">Veuillez patienter pendant le chargement des services...</p>
                    <button class="btn btn-primary" onclick="location.reload()">🔄 Recharger la page</button>
                </div>
            </div>
        `;
        console.warn('⚠️ Aucun service trouvé pour le gestionnaire');
        return;
    }
    
    container.innerHTML = `
        <div class="price-manager-container">
            <div class="price-stats-header">
                <div class="stat-card price-stat">
                    <div class="stat-number">${services.length}</div>
                    <div class="stat-label">Services Actifs</div>
                </div>
                <div class="stat-card price-stat">
                    <div class="stat-number">${getAveragePrice()} DHS</div>
                    <div class="stat-label">Prix Moyen</div>
                </div>
                <div class="stat-card price-stat">
                    <div class="stat-number">${getTotalRevenuePotential()} DHS</div>
                    <div class="stat-label">Revenus Potentiels</div>
                </div>
                <div class="stat-card price-stat">
                    <div class="stat-number" id="lastUpdateTime">Jamais</div>
                    <div class="stat-label">Dernière MAJ</div>
                </div>
            </div>
            <div class="quick-actions-panel">
                <h3>⚡ Actions Rapides</h3>
                <div class="quick-actions-grid">
                    <button class="btn btn-success quick-action-btn" onclick="showBulkPriceUpdate()">
                        📈 Augmentation Globale
                    </button>
                    <button class="btn btn-warning quick-action-btn" onclick="showBulkPriceDecrease()">
                        📉 Réduction Globale
                    </button>
                    <button class="btn btn-info quick-action-btn" onclick="showPresetPricing()">
                        🌟 Tarifs Prédéfinis
                    </button>
                    <button class="btn btn-secondary quick-action-btn" onclick="showPriceHistory()">
                        📊 Historique
                    </button>
                </div>
            </div>
            <div class="individual-services-panel">
                <h3>🎯 Gestion Individuelle des Services</h3>
                <div class="pricing-notice">
                    <p><strong>💡 Info:</strong> Les modifications sont appliquées instantanément et synchronisées avec tous les clients connectés.</p>
                </div>
                <div class="services-management-grid">
                    ${renderServicesCards()}
                </div>
            </div>
        </div>
    `;
    console.log('✅ Interface gestionnaire rendue');
}

function renderServicesCards() {
    if (!services || services.length === 0) {
        return '<div class="no-services"><h4>😕 Aucun service disponible</h4><p>Rechargez la page pour réessayer.</p></div>';
    }
    
    return services.map(service => `
        <div class="service-management-card" data-service-id="${service.id}">
            <div class="service-header">
                <h4>${service.name}</h4>
                <span class="service-status active">Actif</span>
            </div>
            <div class="service-pricing">
                <div class="current-price">
                    <label>Prix Actuel</label>
                    <div class="price-display">${service.price} DHS</div>
                </div>
                <div class="price-input-group">
                    <label>Nouveau Prix (DHS)</label>
                    <div class="input-with-controls">
                        <button class="btn-small btn-decrease" onclick="decreasePrice('${service.id}')">-</button>
                        <input type="number" 
                               id="newPrice_${service.id}" 
                               value="${service.price}" 
                               min="${priceValidationRules.minPrice}" 
                               max="${priceValidationRules.maxPrice}"
                               onchange="validatePriceInput('${service.id}')"
                               oninput="previewPriceChange('${service.id}')">
                        <button class="btn-small btn-increase" onclick="increasePrice('${service.id}')">+</button>
                    </div>
                </div>
                <div class="duration-input-group">
                    <label>Durée (minutes)</label>
                    <input type="number" 
                           id="newDuration_${service.id}" 
                           value="${service.duration}" 
                           min="15" 
                           max="240" 
                           step="15"
                           onchange="previewDurationChange('${service.id}')">
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-primary btn-small" onclick="updateSingleServicePrice('${service.id}')">
                    💾 Mettre à Jour
                </button>
                <button class="btn btn-secondary btn-small" onclick="resetServicePrice('${service.id}')">
                    🔄 Annuler
                </button>
            </div>
            <div class="price-impact" id="impact_${service.id}">
                <small>Impact: <span class="impact-text">Aucun changement</span></small>
            </div>
        </div>
    `).join('');
}

function addPriceManagerStyles() {
    if (document.getElementById('priceManagerStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'priceManagerStyles';
    style.textContent = `
        .price-manager-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
        }
        .price-manager-container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .price-stats-header {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .price-stat {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
            border: none;
            text-align: center;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
        }
        .quick-actions-panel {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .quick-actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .quick-action-btn {
            padding: 15px 20px;
            font-size: 1.1rem;
            border-radius: 10px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-weight: 600;
        }
        .quick-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .individual-services-panel {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .pricing-notice {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        .pricing-notice p {
            margin: 0;
            color: #1976d2;
        }
        .services-management-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .service-management-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        .service-management-card:hover {
            border-color: #27ae60;
            box-shadow: 0 5px 15px rgba(39, 174, 96, 0.2);
        }
        .service-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .service-header h4 {
            margin: 0;
            color: #2c3e50;
        }
        .service-status.active {
            background: #27ae60;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .current-price label {
            font-size: 0.9rem;
            color: #6c757d;
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .price-display {
            font-size: 1.5rem;
            font-weight: bold;
            color: #27ae60;
        }
        .price-input-group, .duration-input-group {
            margin-bottom: 15px;
        }
        .price-input-group label, .duration-input-group label {
            font-size: 0.9rem;
            color: #6c757d;
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .input-with-controls {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .input-with-controls input {
            flex: 1;
            padding: 8px 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
            font-size: 1rem;
        }
        .input-with-controls input:focus {
            border-color: #27ae60;
            outline: none;
            box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
        }
        .btn-small {
            width: 35px;
            height: 35px;
            border: none;
            border-radius: 6px;
            background: #3498db;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 1.1rem;
        }
        .btn-small:hover {
            background: #2980b9;
            transform: scale(1.1);
        }
        .btn-decrease {
            background: #e74c3c;
        }
        .btn-decrease:hover {
            background: #c0392b;
        }
        .btn-increase {
            background: #27ae60;
        }
        .btn-increase:hover {
            background: #229954;
        }
        .duration-input-group input {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
        }
        .duration-input-group input:focus {
            border-color: #27ae60;
            outline: none;
            box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
        }
        .service-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        .service-actions .btn {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .service-actions .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .price-impact {
            text-align: center;
            padding: 8px;
            background: #f1f2f6;
            border-radius: 6px;
        }
        .impact-text.price-increase {
            color: #27ae60;
            font-weight: bold;
        }
        .impact-text.price-decrease {
            color: #e74c3c;
            font-weight: bold;
        }
        .impact-text.no-change {
            color: #6c757d;
        }
        .no-services {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            font-size: 1.1rem;
        }
        .no-services h4 {
            color: #e74c3c;
            margin-bottom: 15px;
        }
        @media (max-width: 768px) {
            .services-management-grid {
                grid-template-columns: 1fr;
            }
            .quick-actions-grid {
                grid-template-columns: 1fr;
            }
            .price-stats-header {
                grid-template-columns: repeat(2, 1fr);
            }
            .price-manager-container {
                padding: 10px;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Styles CSS gestionnaire de prix ajoutés');
}

function refreshPriceManagerIfOpen() {
    const priceSection = document.getElementById('priceManagerSection');
    if (priceSection && priceSection.style.display !== 'none') {
        console.log('🔄 Refresh interface gestionnaire de prix');
        renderPriceManager();
    }
}

function increasePrice(serviceId) {
    console.log('➕ Augmentation prix:', serviceId);
    const input = document.getElementById(`newPrice_${serviceId}`);
    if (!input) {
        console.error('❌ Input non trouvé:', `newPrice_${serviceId}`);
        return;
    }
    
    const currentValue = parseInt(input.value) || 0;
    const newValue = Math.min(currentValue + 5, priceValidationRules.maxPrice);
    input.value = newValue;
    previewPriceChange(serviceId);
}

function decreasePrice(serviceId) {
    console.log('➖ Diminution prix:', serviceId);
    const input = document.getElementById(`newPrice_${serviceId}`);
    if (!input) {
        console.error('❌ Input non trouvé:', `newPrice_${serviceId}`);
        return;
    }
    
    const currentValue = parseInt(input.value) || 0;
    const newValue = Math.max(currentValue - 5, priceValidationRules.minPrice);
    input.value = newValue;
    previewPriceChange(serviceId);
}

function previewPriceChange(serviceId) {
    const service = services.find(s => s.id === serviceId);
    const newPriceInput = document.getElementById(`newPrice_${serviceId}`);
    const impactElement = document.getElementById(`impact_${serviceId}`);
    
    if (!service || !newPriceInput || !impactElement) {
        console.warn('⚠️ Éléments manquants pour preview:', serviceId);
        return;
    }
    
    const oldPrice = service.price;
    const newPrice = parseInt(newPriceInput.value) || 0;
    const difference = newPrice - oldPrice;
    const percentChange = oldPrice > 0 ? ((difference / oldPrice) * 100).toFixed(1) : 0;
    
    let impactText = 'Aucun changement';
    let impactClass = 'no-change';
    
    if (difference > 0) {
        impactText = `+${difference} DHS (+${percentChange}%)`;
        impactClass = 'price-increase';
    } else if (difference < 0) {
        impactText = `${difference} DHS (${percentChange}%)`;
        impactClass = 'price-decrease';
    }
    
    impactElement.innerHTML = `<small>Impact: <span class="impact-text ${impactClass}">${impactText}</span></small>`;
}

function validatePriceInput(serviceId) {
    const input = document.getElementById(`newPrice_${serviceId}`);
    if (!input) return;
    
    const value = parseInt(input.value);
    
    if (value < priceValidationRules.minPrice) {
        input.value = priceValidationRules.minPrice;
        showNotification(`Prix minimum: ${priceValidationRules.minPrice} DHS`, 'warning');
    } else if (value > priceValidationRules.maxPrice) {
        input.value = priceValidationRules.maxPrice;
        showNotification(`Prix maximum: ${priceValidationRules.maxPrice} DHS`, 'warning');
    }
    
    previewPriceChange(serviceId);
}

async function updateSingleServicePrice(serviceId) {
    if (isUpdatingPrices) {
        showNotification('⏳ Mise à jour en cours, veuillez patienter...', 'info');
        return;
    }
    
    try {
        console.log('💾 Mise à jour service:', serviceId);
        isUpdatingPrices = true;
        
        const service = services.find(s => s.id === serviceId);
        const newPriceInput = document.getElementById(`newPrice_${serviceId}`);
        const newDurationInput = document.getElementById(`newDuration_${serviceId}`);
        
        if (!service) {
            showNotification('❌ Service non trouvé', 'error');
            return;
        }
        
        if (!newPriceInput || !newDurationInput) {
            showNotification('❌ Erreur interface', 'error');
            return;
        }
        
        const oldPrice = service.price;
        const oldDuration = service.duration;
        const newPrice = parseInt(newPriceInput.value);
        const newDuration = parseInt(newDurationInput.value);
        
        if (newPrice === oldPrice && newDuration === oldDuration) {
            showNotification('ℹ️ Aucun changement détecté', 'info');
            return;
        }
        
        const updatedService = {
            ...service,
            price: newPrice,
            duration: newDuration,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'admin'
        };
        
        if (firebaseEnabled && db) {
            await db.collection('services').doc(serviceId).set(updatedService);
            console.log('✅ Service mis à jour dans Firebase');
        } else {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                services[serviceIndex] = updatedService;
                localStorage.setItem('services', JSON.stringify(services));
                console.log('✅ Service mis à jour localement');
                refreshPriceManagerIfOpen();
            }
        }
        
        recordPriceChange(serviceId, oldPrice, newPrice, oldDuration, newDuration);
        
        const changes = [];
        if (oldPrice !== newPrice) changes.push(`Prix: ${oldPrice} → ${newPrice} DHS`);
        if (oldDuration !== newDuration) changes.push(`Durée: ${oldDuration} → ${newDuration} min`);
        
        showNotification(`✅ ${service.name} mis à jour! ${changes.join(', ')}`, 'success');
        updateLastUpdateTime();
        
        const event = new CustomEvent('priceUpdated', {
            detail: { serviceName: service.name, oldPrice, newPrice, serviceId }
        });
        document.dispatchEvent(event);
    } catch (error) {
        console.error('❌ Erreur mise à jour service:', error);
        showNotification('❌ Erreur lors de la mise à jour', 'error');
    } finally {
        isUpdatingPrices = false;
    }
}

function resetServicePrice(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (service) {
        const priceInput = document.getElementById(`newPrice_${serviceId}`);
        const durationInput = document.getElementById(`newDuration_${serviceId}`);
        
        if (priceInput) priceInput.value = service.price;
        if (durationInput) durationInput.value = service.duration;
        
        previewPriceChange(serviceId);
        showNotification(`🔄 ${service.name} réinitialisé`, 'info');
    }
}

function previewDurationChange(serviceId) {
    console.log('⏱️ Durée modifiée pour:', serviceId);
}

function showBulkPriceUpdate() {
    const percentage = prompt('💹 Augmentation en pourcentage (ex: 10 pour +10%):');
    if (percentage === null) return;
    
    const percent = parseFloat(percentage);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
        showNotification('❌ Pourcentage invalide (1-100)', 'error');
        return;
    }
    
    if (confirm(`📈 Augmenter tous les prix de ${percent}% ?`)) {
        bulkUpdatePrices(percent, 'increase');
    }
}

function showBulkPriceDecrease() {
    const percentage = prompt('📉 Réduction en pourcentage (ex: 10 pour -10%):');
    if (percentage === null) return;
    
    const percent = parseFloat(percentage);
    if (isNaN(percent) || percent <= 0 || percent > 50) {
        showNotification('❌ Pourcentage invalide (1-50)', 'error');
        return;
    }
    
    if (confirm(`📉 Réduire tous les prix de ${percent}% ?`)) {
        bulkUpdatePrices(percent, 'decrease');
    }
}

async function bulkUpdatePrices(percentage, type) {
    if (isUpdatingPrices) {
        showNotification('⏳ Mise à jour en cours, veuillez patienter...', 'info');
        return;
    }

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        showNotification('❌ Pourcentage invalide (doit être entre 1 et 100)', 'error');
        return;
    }

    try {
        isUpdatingPrices = true;
        showNotification('🔄 Mise à jour en masse...', 'info');

        const multiplier = type === 'increase' ? (1 + percentage / 100) : (1 - percentage / 100);
        const updates = [];

        for (const service of services) {
            if (!service.id || !Number.isFinite(service.price)) {
                console.warn(`Service invalide ignoré: ${service.name || 'inconnu'}`);
                continue;
            }

            const oldPrice = service.price;
            const newPrice = Math.round(oldPrice * multiplier);
            const validatedPrice = Math.max(
                priceValidationRules.minPrice,
                Math.min(newPrice, priceValidationRules.maxPrice)
            );

            const updatedService = {
                ...service,
                price: validatedPrice,
                lastUpdated: new Date().toISOString(),
                updatedBy: 'admin'
            };

            updates.push({
                serviceId: service.id,
                service: updatedService,
                oldPrice,
                newPrice: validatedPrice
            });
        }

        if (firebaseEnabled && db) {
            const batch = db.batch();
            updates.forEach(update => {
                const serviceRef = db.collection('services').doc(update.serviceId);
                batch.set(serviceRef, update.service);
            });
            await batch.commit();
            console.log('✅ Mise à jour en masse Firebase');
        } else {
            updates.forEach(update => {
                const serviceIndex = services.findIndex(s => s.id === update.serviceId);
                if (serviceIndex !== -1) {
                    services[serviceIndex] = update.service;
                }
            });
            localStorage.setItem('services', JSON.stringify(services));
            console.log('✅ Mise à jour en masse locale');
            refreshPriceManagerIfOpen();
        }

        recordBulkPriceChange(updates, type, percentage);

        const action = type === 'increase' ? 'augmentés' : 'réduits';
        showNotification(`✅ Tous les prix ${action} de ${percentage}% !`, 'success');

        updateLastUpdateTime();
    } catch (error) {
        console.error('❌ Erreur mise à jour en masse:', error);
        showNotification('❌ Erreur lors de la mise à jour en masse', 'error');
    } finally {
        isUpdatingPrices = false;
    }
}

function showPresetPricing() {
    const presets = {
        'economique': { multiplier: 0.8, name: 'Tarifs Économiques (-20%)' },
        'standard': { multiplier: 1.0, name: 'Tarifs Standards (reset)' },
        'premium': { multiplier: 1.3, name: 'Tarifs Premium (+30%)' },
        'weekend': { multiplier: 1.15, name: 'Tarifs Weekend (+15%)' }
    };

    const choice = prompt(`🌟 Choisissez un preset de tarification:\n\n1. economique - ${presets.economique.name}\n2. standard - ${presets.standard.name}\n3. premium - ${presets.premium.name}\n4. weekend - ${presets.weekend.name}\n\nTapez le nom du preset:`);

    if (!choice) {
        showNotification('❌ Opération annulée', 'info');
        return;
    }

    const preset = presets[choice.toLowerCase()];
    if (!preset) {
        showNotification('❌ Preset non reconnu. Utilisez: economique, standard, premium, ou weekend', 'error');
        return;
    }

    if (confirm(`🎯 Appliquer ${preset.name} ?`)) {
        applyPresetPricing(choice.toLowerCase(), preset);
    }
}

async function applyPresetPricing(presetName, preset) {
    try {
        isUpdatingPrices = true;
        showNotification(`🌟 Application du preset ${preset.name}...`, 'info');
        
        const baseServices = getDefaultServices();
        const updates = [];
        
        for (const service of services) {
            const baseService = baseServices.find(b => b.id === service.id);
            const basePrice = baseService ? baseService.price : service.price;
            const newPrice = Math.round(basePrice * preset.multiplier);
            
            const validatedPrice = Math.max(
                priceValidationRules.minPrice, 
                Math.min(newPrice, priceValidationRules.maxPrice)
            );
            
            const updatedService = {
                ...service,
                price: validatedPrice,
                lastUpdated: new Date().toISOString(),
                updatedBy: 'admin'
            };
            
            updates.push({
                serviceId: service.id,
                service: updatedService,
                oldPrice: service.price,
                newPrice: validatedPrice
            });
        }
        
        if (firebaseEnabled && db) {
            const batch = db.batch();
            updates.forEach(update => {
                const serviceRef = db.collection('services').doc(update.serviceId);
                batch.set(serviceRef, update.service);
            });
            await batch.commit();
        } else {
            updates.forEach(update => {
                const serviceIndex = services.findIndex(s => s.id === update.serviceId);
                if (serviceIndex !== -1) {
                    services[serviceIndex] = update.service;
                }
            });
            localStorage.setItem('services', JSON.stringify(services));
            refreshPriceManagerIfOpen();
        }
        
        const change = {
            id: `preset_${Date.now()}`,
            type: 'preset',
            presetName: presetName,
            presetDescription: preset.name,
            affectedServices: updates.length,
            timestamp: new Date().toISOString(),
            details: updates.map(u => ({
                serviceName: u.service.name,
                oldPrice: u.oldPrice,
                newPrice: u.newPrice
            }))
        };
        
        priceUpdateHistory.unshift(change);
        localStorage.setItem('priceUpdateHistory', JSON.stringify(priceUpdateHistory));
        
        showNotification(`✅ Preset ${preset.name} appliqué avec succès!`, 'success');
        updateLastUpdateTime();
    } catch (error) {
        console.error('❌ Erreur application preset:', error);
        showNotification('❌ Erreur lors de l\'application du preset', 'error');
    } finally {
        isUpdatingPrices = false;
    }
}

function getAveragePrice() {
    if (!services || services.length === 0) return 0;
    const total = services.reduce((sum, service) => sum + service.price, 0);
    return Math.round(total / services.length);
}

function getTotalRevenuePotential() {
    if (!services || services.length === 0) return 0;
    return services.reduce((sum, service) => sum + service.price, 0);
}

function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdateTime');
    if (element) {
        element.textContent = new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function loadPriceHistory() {
    try {
        priceUpdateHistory = JSON.parse(localStorage.getItem('priceUpdateHistory') || '[]');
        console.log(`📊 ${priceUpdateHistory.length} entrées d'historique chargées`);
    } catch (error) {
        console.error('Erreur chargement historique:', error);
        priceUpdateHistory = [];
    }
}

function recordPriceChange(serviceId, oldPrice, newPrice, oldDuration, newDuration) {
    const change = {
        id: `change_${Date.now()}`,
        serviceId: serviceId,
        serviceName: services.find(s => s.id === serviceId)?.name || 'Service inconnu',
        oldPrice: oldPrice,
        newPrice: newPrice,
        oldDuration: oldDuration,
        newDuration: newDuration,
        timestamp: new Date().toISOString(),
        type: 'individual'
    };
    
    priceUpdateHistory.unshift(change);
    
    if (priceUpdateHistory.length > 50) {
        priceUpdateHistory = priceUpdateHistory.slice(0, 50);
    }
    
    localStorage.setItem('priceUpdateHistory', JSON.stringify(priceUpdateHistory));
}

function recordBulkPriceChange(updates, type, percentage) {
    const change = {
        id: `bulk_${Date.now()}`,
        type: 'bulk',
        action: type,
        percentage: percentage,
        affectedServices: updates.length,
        timestamp: new Date().toISOString(),
        details: updates.map(u => ({
            serviceName: u.service.name,
            oldPrice: u.oldPrice,
            newPrice: u.newPrice
        }))
    };
    
    priceUpdateHistory.unshift(change);
    localStorage.setItem('priceUpdateHistory', JSON.stringify(priceUpdateHistory));
}

function showPriceHistory() {
    if (priceUpdateHistory.length === 0) {
        showNotification('📊 Aucun historique de prix disponible', 'info');
        return;
    }
    
    const historyText = priceUpdateHistory.slice(0, 5).map(change => {
        const time = new Date(change.timestamp).toLocaleString('fr-FR');
        if (change.type === 'bulk') {
            return `${time}: ${change.action} de ${change.percentage}% sur ${change.affectedServices} services`;
        } else if (change.type === 'preset') {
            return `${time}: Preset ${change.presetDescription} appliqué`;
        } else {
            return `${time}: ${change.serviceName} - ${change.oldPrice} → ${change.newPrice} DHS`;
        }
    }).join('\n');
    
    alert(`📊 Historique des 5 dernières modifications:\n\n${historyText}`);
}

// Exposer les fonctions nécessaires
window.showPriceManager = showPriceManager;
window.updateSingleServicePrice = updateSingleServicePrice;
window.increasePrice = increasePrice;
window.decreasePrice = decreasePrice;
window.resetServicePrice = resetServicePrice;
window.showBulkPriceUpdate = showBulkPriceUpdate;
window.showBulkPriceDecrease = showBulkPriceDecrease;
window.showPriceHistory = showPriceHistory;
window.showPresetPricing = showPresetPricing;
window.validatePriceInput = validatePriceInput;
window.previewPriceChange = previewPriceChange;
window.previewDurationChange = previewDurationChange;