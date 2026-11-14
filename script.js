// ======================================================
// TERRENO BROASTER - PEDIDOS WEB POS
// ======================================================

// 1. Credenciales Supabase
const SUPABASE_URL = 'https://eeapyvpcsyngnqzlqgvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FLFlDnyJKB5SERnjsDk53g_KlmZIgQT';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Categorías con sus respectivos emojis
const CATEGORY_ICONS = {
    'Todas': '🍽️',
    'Pollo': '🍗',
    'Pizzas': '🍕',
    'Hamburguesas': '🍔',
    'Bebidas': '🥤',
    'Extras': '🍟',
    'Empanadas': '🥟',
    'Ración': '🥘'
};

// Estado global de la aplicación
let allProducts = [];
let cart = []; // [{ id, nombre, precio, categoria, descripcion, imagen, cantidad }]
let selectedCategory = 'Todas';
let searchQuery = '';

// Elementos del DOM
const categoriesBar = document.getElementById('categoriesBar');
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const currentCategoryTitle = document.getElementById('currentCategoryTitle');
const catalogCount = document.getElementById('catalogCount');
const noResults = document.getElementById('noResults');

// Carrito flotante y Modales
const floatingCart = document.getElementById('floatingCart');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartTotalDisplay = document.getElementById('cartTotalDisplay');
const btnOpenCart = document.getElementById('btnOpenCart');

const cartModal = document.getElementById('cartModal');
const btnCloseCart = document.getElementById('btnCloseCart');
const btnContinueShopping = document.getElementById('btnContinueShopping');
const cartItemsList = document.getElementById('cartItemsList');
const modalTotalBig = document.getElementById('modalTotalBig');
const customerNameInput = document.getElementById('customerName');
const orderNotesInput = document.getElementById('orderNotes');
const customerPhoneInput = document.getElementById('customerPhone');
const customerAddressInput = document.getElementById('customerAddress');
const orderOriginSelect = document.getElementById('orderOrigin');
const addressGroup = document.getElementById('addressGroup');
const btnConfirmOrder = document.getElementById('btnConfirmOrder');
const modalStatusMessage = document.getElementById('modalStatusMessage');

const successModal = document.getElementById('successModal');
const btnSuccessOk = document.getElementById('btnSuccessOk');
const successDetails = document.getElementById('successDetails');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsCatalog();
    renderCategories();
    renderProducts();
    setupEventListeners();
});

// Cargar catálogo de platos (intenta desde platos.json y si falla usa catálogo integrado)
async function loadProductsCatalog() {
    try {
        const response = await fetch('platos.json');
        if (!response.ok) throw new Error('No se pudo cargar platos.json');
        allProducts = await response.json();
    } catch (err) {
        console.warn('Cargando platos desde datos de respaldo integrados...', err);
        allProducts = getEmbeddedPlatosFallback();
    }
}

// Configurar escuchadores de eventos
function setupEventListeners() {
    // Búsqueda en tiempo real
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderProducts();
    });

    // Abrir modal de carrito
    btnOpenCart.addEventListener('click', openCartModal);

    // Cerrar modal de carrito
    btnCloseCart.addEventListener('click', closeCartModal);
    btnContinueShopping.addEventListener('click', closeCartModal);

    // Mostrar/ocultar dirección según el tipo de pedido
    orderOriginSelect.addEventListener('change', updateOriginFields);
    updateOriginFields();

    // Confirmar pedido
    btnConfirmOrder.addEventListener('click', handleConfirmOrder);

    // Cerrar modal de éxito
    btnSuccessOk.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });

    // Cerrar modales con clic fuera del contenido
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) closeCartModal();
    });
}

// Formateador de moneda en Pesos Colombianos (COP)
// Escapa texto para insertarlo de forma segura en HTML
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatMoney(amount) {
    return '$' + Math.round(amount).toLocaleString('es-CO') + ' COP';
}

// Renderizar barra de categorías
function renderCategories() {
    categoriesBar.innerHTML = '';

    // Extraer categorías únicas
    const categoriesSet = new Set(allProducts.map(p => p.categoria).filter(Boolean));
    const categories = ['Todas', ...Array.from(categoriesSet).sort()];

    categories.forEach(cat => {
        const count = cat === 'Todas' ? allProducts.length : allProducts.filter(p => p.categoria === cat).length;
        const icon = CATEGORY_ICONS[cat] || '🍴';

        const btn = document.createElement('button');
        btn.className = `cat-btn ${cat === selectedCategory ? 'active' : ''}`;
        btn.innerHTML = `<span>${icon} ${cat}</span> <span class="cat-count">${count}</span>`;
        btn.onclick = () => {
            selectedCategory = cat;
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts();
        };

        categoriesBar.appendChild(btn);
    });
}

// Renderizar cuadrícula de productos según filtro y búsqueda
function renderProducts() {
    productsGrid.innerHTML = '';

    let filtered = allProducts;

    // Filtro por categoría
    if (selectedCategory !== 'Todas') {
        filtered = filtered.filter(p => p.categoria.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filtro por búsqueda
    if (searchQuery !== '') {
        filtered = filtered.filter(p => 
            p.nombre.toLowerCase().includes(searchQuery) || 
            (p.categoria && p.categoria.toLowerCase().includes(searchQuery)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery))
        );
    }

    // Actualizar encabezados
    currentCategoryTitle.textContent = selectedCategory === 'Todas' ? 'Todos los platos' : `${CATEGORY_ICONS[selectedCategory] || ''} ${selectedCategory}`;
    catalogCount.textContent = `${filtered.length} productos`;

    if (filtered.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');

    filtered.forEach(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const qtyInCart = cartItem ? cartItem.cantidad : 0;
        const fallbackIcon = CATEGORY_ICONS[product.categoria] || '🍗';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-image-wrap">
                <span class="card-badge">${product.categoria}</span>
                <img src="img/${product.imagen}" alt="${product.nombre}" loading="lazy"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="card-fallback-icon" style="display: none;">${fallbackIcon}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${product.nombre}</h3>
                ${product.descripcion ? `<p class="card-desc" title="Toca para ver más o menos" onclick="this.classList.toggle('expanded')">${escapeHtml(product.descripcion)}</p>` : ''}
                <div class="card-price">${formatMoney(product.precio)}</div>
                <div id="btn-wrap-${product.id}">
                    ${renderCardAction(product.id, qtyInCart)}
                </div>
            </div>
        `;

        productsGrid.appendChild(card);
    });
}

// Renderizar botón de acción (Agregar o Control de Cantidad)
function renderCardAction(productId, qty) {
    if (qty > 0) {
        return `
            <div class="qty-control">
                <button class="qty-btn" onclick="changeQuantity(${productId}, -1)">−</button>
                <span class="qty-value">${qty}</span>
                <button class="qty-btn" onclick="changeQuantity(${productId}, 1)">+</button>
            </div>
        `;
    }
    return `
        <button class="btn-add-cart" onclick="addToCart(${productId})">
            <span>+</span> Agregar
        </button>
    `;
}

// Agregar producto al carrito
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.cantidad++;
    } else {
        cart.push({ ...product, cantidad: 1 });
    }

    updateCartUI();
    refreshCardButton(productId);
}

// Modificar cantidad de un producto
function changeQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index === -1) return;

    cart[index].cantidad += delta;
    if (cart[index].cantidad <= 0) {
        cart.splice(index, 1);
    }

    updateCartUI();
    refreshCardButton(productId);
    if (!cartModal.classList.contains('hidden')) {
        renderCartModalItems();
    }
}

// Refrescar el botón de una tarjeta específica sin redibujar todo
function refreshCardButton(productId) {
    const wrap = document.getElementById(`btn-wrap-${productId}`);
    if (!wrap) return;
    const item = cart.find(p => p.id === productId);
    const qty = item ? item.cantidad : 0;
    wrap.innerHTML = renderCardAction(productId, qty);
}

// Actualizar barra flotante y contadores
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
    const totalMoney = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    if (totalItems > 0) {
        floatingCart.classList.remove('hidden');
        cartCountBadge.textContent = totalItems;
        cartTotalDisplay.textContent = formatMoney(totalMoney);
    } else {
        floatingCart.classList.add('hidden');
    }
}

// La dirección solo aplica a pedidos Online (domicilio)
function updateOriginFields() {
    const isOnline = orderOriginSelect.value === 'Online';
    addressGroup.classList.toggle('hidden', !isOnline);
}

function showFormError(msg, field) {
    modalStatusMessage.textContent = msg;
    modalStatusMessage.className = 'status-msg error';
    modalStatusMessage.classList.remove('hidden');
    if (field) field.focus();
}

// Abrir modal de carrito
function openCartModal() {
    if (cart.length === 0) return;
    renderCartModalItems();
    modalStatusMessage.classList.add('hidden');
    cartModal.classList.remove('hidden');
}

// Cerrar modal de carrito
function closeCartModal() {
    cartModal.classList.add('hidden');
}

// Renderizar productos dentro del modal
function renderCartModalItems() {
    cartItemsList.innerHTML = '';
    const totalMoney = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    if (cart.length === 0) {
        closeCartModal();
        return;
    }

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.nombre}</div>
                <div class="item-subtext">${formatMoney(item.precio)} c/u</div>
            </div>
            <div class="qty-control" style="width: 100px; margin-right: 12px;">
                <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)">−</button>
                <span class="qty-value">${item.cantidad}</span>
                <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
            </div>
            <div class="item-subtotal">${formatMoney(item.precio * item.cantidad)}</div>
        `;
        cartItemsList.appendChild(row);
    });

    modalTotalBig.textContent = formatMoney(totalMoney);
}

// Confirmar y Enviar Pedido a Supabase

async function handleConfirmOrder() {
    if (cart.length === 0) return;

    // Datos del formulario
    const origen = orderOriginSelect.value; // 'Online' | 'Local'
    const cliente = customerNameInput.value.trim();
    const telefono = customerPhoneInput.value.trim();
    const direccion = origen === 'Online' ? customerAddressInput.value.trim() : '';
    const notas = orderNotesInput.value.trim();

    // Validaciones
    if (!cliente) return showFormError('Por favor ingresa el nombre del cliente.', customerNameInput);
    if (!telefono) return showFormError('Por favor ingresa un número de teléfono.', customerPhoneInput);
    if (!/^[0-9+\s()-]{7,15}$/.test(telefono)) return showFormError('El teléfono no parece válido.', customerPhoneInput);
    if (origen === 'Online' && !direccion) return showFormError('Por favor ingresa la dirección de entrega.', customerAddressInput);

    btnConfirmOrder.disabled = true;
    btnConfirmOrder.textContent = "Enviando pedido a la nube...";
    modalStatusMessage.textContent = "Transmitiendo pedido al restaurante...";
    modalStatusMessage.className = "status-msg loading";
    modalStatusMessage.classList.remove('hidden');

    // Un registro por producto, con cantidad y datos del cliente
    const payload = cart.map(item => ({
        producto: item.nombre,
        cantidad: item.cantidad,
        cliente: cliente,
        telefono: telefono,
        direccion: direccion,
        origen: origen,
        notas: notas,
        estado: 'Pendiente'
    }));

    try {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .insert(payload);

        if (error) throw error;

        closeCartModal();
        showOrderSuccess(cart);

        cart = [];
        updateCartUI();
        renderProducts();

    } catch (err) {
        console.error("Error al enviar el pedido:", err);
        modalStatusMessage.textContent =
            "Hubo un error al enviar tu pedido: " +
            (err.message || 'Error de conexión');
        modalStatusMessage.className = "status-msg error";

    } finally {
        btnConfirmOrder.disabled = false;
        btnConfirmOrder.textContent = "🚀 Confirmar y Enviar Pedido";
    }
}

// Mostrar diálogo de éxito
function showOrderSuccess(orderedItems) {
    const totalItems = orderedItems.reduce((sum, item) => sum + item.cantidad, 0);
    const totalMoney = orderedItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const cliente = customerNameInput.value.trim();
    const telefono = customerPhoneInput.value.trim();
    const direccion = customerAddressInput.value.trim();
    const origen = orderOriginSelect.value;

    let detailsHtml = `
        <div style="margin-bottom: 6px;">Total platos: <strong>${totalItems}</strong></div>
        <div style="margin-bottom: 6px;">Total a pagar: <strong style="color:#d97706;">${formatMoney(totalMoney)}</strong></div>
        <div style="margin-bottom: 6px;">Tipo: <strong>${escapeHtml(origen)}</strong></div>
        <div style="margin-bottom: 6px;">Cliente: <strong>${escapeHtml(cliente)}</strong></div>
        <div style="margin-bottom: 6px;">Teléfono: <strong>${escapeHtml(telefono)}</strong></div>
        ${origen === 'Online' && direccion ? `<div>Dirección: <strong>${escapeHtml(direccion)}</strong></div>` : ''}
    `;
    successDetails.innerHTML = detailsHtml;

    customerNameInput.value = '';
    customerPhoneInput.value = '';
    customerAddressInput.value = '';
    orderNotesInput.value = '';
    orderOriginSelect.value = 'Online';
    updateOriginFields();
    successModal.classList.remove('hidden');
}

// Datos de respaldo integrados (por si se abre vía file:/// y falla fetch platos.json)
// Debe mantenerse igual que platos.json
function getEmbeddedPlatosFallback() {
    return [
        { id: 69, nombre: "Agua Mineral", precio: 3000, categoria: "Bebidas", descripcion: "Agua mineral en envase plástico de 350 cc", imagen: "bebida8.jpg" },
        { id: 72, nombre: "Cerveza Lata", precio: 4000, categoria: "Bebidas", descripcion: "Cerveza Aguila Light en presentación lata de 330 cc", imagen: "bebida10.jpg" },
        { id: 85, nombre: "CocaCola 1.5 Lt", precio: 6000, categoria: "Bebidas", descripcion: "Gaseosa de cola negra en envase PET desechable de litro y medio", imagen: "cocacolalitron.jpg" },
        { id: 86, nombre: "Gaseosa Personal", precio: 3000, categoria: "Bebidas", descripcion: "Bebida fría y refrescante en presentación personal o familiar para acompañar tu comida.", imagen: "gaseosapersonal.jpg" },
        { id: 70, nombre: "Gaseosas 1.5", precio: 4500, categoria: "Bebidas", descripcion: "Gaseosas varios sabores marca POSTOBON en envase PET desechable de litro y medio", imagen: "bebida1.jpg" },
        { id: 99, nombre: "Malta Lata", precio: 3000, categoria: "Bebidas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "9.jpg" },
        { id: 1, nombre: "Pepsi 2 Litros", precio: 5500, categoria: "Bebidas", descripcion: "Gaseosa de cola negra en envase PET de 2 litros", imagen: "bebida6.jpg" },
        { id: 84, nombre: "Pepsi Litro y Medio", precio: 4500, categoria: "Bebidas", descripcion: "Gaseosa de cola negra en envase PET desechable de litro y medio", imagen: "pepsilitron.jpg" },
        { id: 87, nombre: "Red Bull 250", precio: 7000, categoria: "Bebidas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "redbull.jpg" },
        { id: 110, nombre: "Cachito", precio: 5000, categoria: "Extras", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "cahito.jpg" },
        { id: 104, nombre: "Caraotas/Queso", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empCaraotaqueso.jpg" },
        { id: 108, nombre: "Jamon/Queso", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empJamonQueso.jpg" },
        { id: 101, nombre: "Mechada", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empMechada.jpg" },
        { id: 102, nombre: "Mechada-Queso", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "EmpMechadaqueso.jpg" },
        { id: 111, nombre: "Mini Pan", precio: 6000, categoria: "Extras", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "minipan.jpg" },
        { id: 105, nombre: "Molida", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empMolida.jpg" },
        { id: 103, nombre: "Pabellon", precio: 4000, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empPabellon.jpg" },
        { id: 109, nombre: "Pollo", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empPollo.jpg" },
        { id: 107, nombre: "Queso", precio: 3000, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empQuso.jpg" },
        { id: 106, nombre: "Salch/Queso", precio: 3500, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "empSalchichasQueso.jpg" },
        { id: 77, nombre: "Burger Carne", precio: 12000, categoria: "Hamburguesas", descripcion: "200 grs de carne, vegetales, jamón, queso, papitas,salsa", imagen: "Hamb2.jpg" },
        { id: 81, nombre: "Burger Chuleta", precio: 18000, categoria: "Hamburguesas", descripcion: "200 grs de carne, vegetales, jamón, queso, papitas,salsa", imagen: "Hamb6.jpg" },
        { id: 80, nombre: "Burger Mixta", precio: 18000, categoria: "Hamburguesas", descripcion: "200 grs de carne, vegetales, jamón, queso, papitas,salsa", imagen: "Hamb5.jpg" },
        { id: 78, nombre: "Burger Pollo", precio: 12000, categoria: "Hamburguesas", descripcion: "200 grs de carne, vegetales, jamón, queso, papitas,salsa", imagen: "Hamb4.jpg" },
        { id: 79, nombre: "Burger doble carne", precio: 18000, categoria: "Hamburguesas", descripcion: "200 grs de carne, vegetales, jamón, queso, papitas,salsa", imagen: "Hamb3.jpg" },
        { id: 20, nombre: "4 Estaciones", precio: 30000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "4estaciones.jpg" },
        { id: 68, nombre: "4 Sabores Familiar", precio: 80000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "saborfamiliar.jpg" },
        { id: 31, nombre: "Charcutera", precio: 30000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "charcutera.jpg" },
        { id: 23, nombre: "Combo 2 Sabores Mezclados", precio: 45000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "combo2sabores.jpg" },
        { id: 28, nombre: "Combo Crazzy", precio: 57000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "combotrio.jpg" },
        { id: 21, nombre: "Combo Doble", precio: 38000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "combodoble.jpg" },
        { id: 24, nombre: "Combo Duo Especial", precio: 34000, categoria: "Pizzas", descripcion: "3 presas de pollo broaster crujiente, papas fritas crocantes, 2 arepas doraditas y variedad de salsas.", imagen: "comboduo.jpg" },
        { id: 29, nombre: "Combo Elegante Familiar", precio: 70000, categoria: "Pizzas", descripcion: "8 presas de pollo broaster crujiente, porción grande de papas a la francesa, 4 arepas, ensalada de la casa y salsas artesanales.", imagen: "pizzaelegante.jpg" },
        { id: 22, nombre: "Combo Food Pizza", precio: 38000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "combofood.jpg" },
        { id: 27, nombre: "Combo Gold Pizza", precio: 45000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "goldpizza.jpg" },
        { id: 26, nombre: "Combo Mix Pizza", precio: 45000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "tripizza.jpg" },
        { id: 25, nombre: "Combo Pepperoni", precio: 60000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "combopepe.jpg" },
        { id: 18, nombre: "Doble Jamón y Queso", precio: 30000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "pizza5.jpg" },
        { id: 19, nombre: "Doble Queso", precio: 35000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "pizzaqueso.jpg" },
        { id: 30, nombre: "Hawaiana", precio: 30000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "hawaiana.jpg" },
        { id: 32, nombre: "Trio Especial", precio: 70000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "trioespecial.jpg" },
        { id: 33, nombre: "Trio Pizza", precio: 40000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "triopizzas.jpg" },
        { id: 67, nombre: "Triple Tentación", precio: 65000, categoria: "Pizzas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "tripletentacion.jpg" },
        { id: 15, nombre: "1/4 Pollo Asado", precio: 12000, categoria: "Pollo", descripcion: "- 1/4 Poolo asado\n- ración de papas sancochadas\n- ración de arepitas fritas\n- ración de salsas", imagen: "Broaster10.jpg" },
        { id: 9, nombre: "1/4 Broaster (Pierna+Pernil)", precio: 15000, categoria: "Pollo", descripcion: "- 2 pzas pollo\n- Papitas a la francesa\n- Arepitas fritas\n- Salsas variadas", imagen: "1-1 - copia.jpg" },
        { id: 7, nombre: "Ahorro", precio: 36000, categoria: "Pollo", descripcion: "- 6 pzas pollo\n- Papitas a la francesa\n- Arepitas fritas\n- Ensalada rayada dulce\n- Salsas variadas", imagen: "comboahorro.jpg" },
        { id: 16, nombre: "Alitas BBQ", precio: 17000, categoria: "Pollo", descripcion: "Alitas crocantes marinadas en salsa BBQ o picante.", imagen: "Alitas.jpg" },
        { id: 17, nombre: "Alitas Promo 2 x1", precio: 17000, categoria: "Pollo", descripcion: "Alitas crocantes marinadas en salsa BBQ o picante,", imagen: "alitas2x1.jpg" },
        { id: 5, nombre: "Clásica", precio: 45000, categoria: "Pollo", descripcion: "- 8 pzas pollo Broaster\n- Papitas a la francesa\n- Arepitas fritas\n- Salsas variadas", imagen: "clasica.jpg" },
        { id: 4, nombre: "Clásica Full", precio: 50000, categoria: "Pollo", descripcion: "- 8 pzas pollo\n- Papitas a la francesa\n- Arepitas fritas\n- Ensalada rayada dulce\n- Salsas variadas\n-Gaseosa 1.5 Lt Pepsi", imagen: "comboclasico - copia.jpg" },
        { id: 10, nombre: "Combo Especial", precio: 26000, categoria: "Pollo", descripcion: "- 2 pzas pollo\r\n- Papitas a la francesa\r\n- Arepitas fritas\r\n- Ensalada rayada dulce\r\n- Salsas variadas", imagen: "comboespecial.jpg" },
        { id: 11, nombre: "Combo Hot Familiar", precio: 40000, categoria: "Pollo", descripcion: "- 2 pzas pollo\r\n- Papitas a la francesa\r\n- Arepitas fritas\r\n- Ensalada rayada dulce\r\n- Salsas variadas", imagen: "combofamilia.jpg" },
        { id: 8, nombre: "Medio Broaster", precio: 25000, categoria: "Pollo", descripcion: "- 4 pzas pollo\n- Papitas a la francesa\n- Arepitas fritas\n- Salsas variadas", imagen: "mediobroaster.jpg" },
        { id: 14, nombre: "Medio Pollo Asado", precio: 22000, categoria: "Pollo", descripcion: "1/2  Poolo asado\n- ración de papas sancochadas\n- ración de arepitas fritas\n- ración de salsas", imagen: "mediopollo.jpg" },
        { id: 12, nombre: "Pollo Entero Asado", precio: 35000, categoria: "Pollo", descripcion: "1 Pollo asado\n- ración de papas sancochadas\n- ración de arepitas fritas\n- ración de salsas", imagen: "Plato36.jpg" },
        { id: 13, nombre: "Promo Asado Entero", precio: 30000, categoria: "Pollo", descripcion: "- Papas sancochadas\n- Yuca sancochada\n- Guasacaca\n- Ensalada Rayada", imagen: "asadoentero.jpg" },
        { id: 6, nombre: "Irresistible", precio: 39000, categoria: "Pollo", descripcion: "- 8 pzas pollo\n- Arepitas fritas\n- Salsas variadas", imagen: "irresistible.jpg" },
        { id: 114, nombre: "Empanada Camarones", precio: 4000, categoria: "Empanadas", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "Tope1.jpg" },
        { id: 115, nombre: "Yuca Sancochada", precio: 3000, categoria: "Ración", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "yucasancochada.jpg" },
        { id: 116, nombre: "Papitas Fritas", precio: 4000, categoria: "Ración", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "5-1.jpg" },
        { id: 117, nombre: "Tope de Salchichón", precio: 3000, categoria: "Extras", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "Peperoni.jpg" },
        { id: 118, nombre: "Tope de Pimentón", precio: 3000, categoria: "Extras", descripcion: "Preparado artesanalmente con ingredientes frescos seleccionados y el auténtico sabor de Terreno Broaster.", imagen: "Pimenton.jpg" },
        { id: 121, nombre: "Alitas de Pollo", precio: 9000, categoria: "Pollo", descripcion: "Producto listo para servir: Alitas de Pollo.", imagen: "combo_personal.jpg" },
        { id: 122, nombre: "1/4 Broaster (Pechuga+Ala)", precio: 13000, categoria: "Pollo", descripcion: "-2 pzas de pollo broaster\n- ración de papas fritas\n- ración de Arepitas\n- Salsas", imagen: "1-1 - copia.jpg" }
    ];
}
