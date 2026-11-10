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
    'Extras': '🍟'
};

// Estado global de la aplicación
let allProducts = [];
let cart = []; // [{ id, nombre, precio, categoria, imagen, cantidad }]
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
            (p.categoria && p.categoria.toLowerCase().includes(searchQuery))
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

    btnConfirmOrder.disabled = true;
    btnConfirmOrder.textContent = "Enviando pedido a la nube...";
    modalStatusMessage.textContent = "Transmitiendo pedido al restaurante...";
    modalStatusMessage.className = "status-msg loading";
    modalStatusMessage.classList.remove('hidden');

    // Un registro por producto, con cantidad y cliente
    const cliente = customerNameInput.value.trim();

    const payload = cart.map(item => ({
        producto: item.nombre,
        cantidad: item.cantidad,
        cliente: cliente,
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

    let detailsHtml = `
        <div style="margin-bottom: 6px;">Total platos: <strong>${totalItems}</strong></div>
        <div style="margin-bottom: 6px;">Total a pagar: <strong style="color:#d97706;">${formatMoney(totalMoney)}</strong></div>
        ${cliente ? `<div>Cliente / Mesa: <strong>${cliente}</strong></div>` : ''}
    `;
    successDetails.innerHTML = detailsHtml;

    customerNameInput.value = '';
    orderNotesInput.value = '';
    successModal.classList.remove('hidden');
}

// Datos de respaldo integrados (por si se abre vía file:/// y falla fetch platos.json)
function getEmbeddedPlatosFallback() {
    return [
        { id: 8, nombre: "Medio Broaster", precio: 22000, categoria: "Pollo", imagen: "mediobroaster.jpg" },
        { id: 9, nombre: "1/4 Broaster", precio: 10000, categoria: "Pollo", imagen: "1-1 - copia.jpg" },
        { id: 4, nombre: "Clásica Full", precio: 40000, categoria: "Pollo", imagen: "comboclasico - copia.jpg" },
        { id: 5, nombre: "Clásica", precio: 40000, categoria: "Pollo", imagen: "clasica.jpg" },
        { id: 6, nombre: "Irresistible", precio: 33000, categoria: "Pollo", imagen: "irresistible.jpg" },
        { id: 7, nombre: "Ahorro", precio: 32000, categoria: "Pollo", imagen: "comboahorro.jpg" },
        { id: 10, nombre: "Combo Especial", precio: 26000, categoria: "Pollo", imagen: "comboespecial.jpg" },
        { id: 11, nombre: "Combo Hot Familiar", precio: 40000, categoria: "Pollo", imagen: "combofamilia.jpg" },
        { id: 12, nombre: "Pollo Entero Asado", precio: 34000, categoria: "Pollo", imagen: "Plato36.jpg" },
        { id: 13, nombre: "Promo Asado Entero", precio: 30000, categoria: "Pollo", imagen: "asadoentero.jpg" },
        { id: 14, nombre: "Medio Pollo Asado", precio: 20000, categoria: "Pollo", imagen: "mediopollo.jpg" },
        { id: 15, nombre: "1/4 Asado", precio: 10000, categoria: "Pollo", imagen: "Broaster10.jpg" },
        { id: 16, nombre: "Alitas BBQ", precio: 15000, categoria: "Pollo", imagen: "Alitas.jpg" },
        { id: 17, nombre: "Alitas Promo 2 x1 ", precio: 15000, categoria: "Pollo", imagen: "alitas2x1.jpg" },
        { id: 113, nombre: "Uno", precio: 12000, categoria: "Pollo", imagen: "6.jpg" },
        { id: 20, nombre: "4 Estaciones", precio: 30000, categoria: "Pizzas", imagen: "4estaciones.jpg" },
        { id: 68, nombre: "4 Sabores Familiar", precio: 80000, categoria: "Pizzas", imagen: "saborfamiliar.jpg" },
        { id: 31, nombre: "Charcutera", precio: 30000, categoria: "Pizzas", imagen: "charcutera.jpg" },
        { id: 23, nombre: "Combo 2 Sabores Mezclados", precio: 45000, categoria: "Pizzas", imagen: "combo2sabores.jpg" },
        { id: 28, nombre: "Combo Crazzy", precio: 57000, categoria: "Pizzas", imagen: "combotrio.jpg" },
        { id: 21, nombre: "Combo Doble", precio: 38000, categoria: "Pizzas", imagen: "combodoble.jpg" },
        { id: 24, nombre: "Combo Duo Especial", precio: 34000, categoria: "Pizzas", imagen: "comboduo.jpg" },
        { id: 29, nombre: "Combo Elegante Familiar", precio: 70000, categoria: "Pizzas", imagen: "pizzaelegante.jpg" },
        { id: 22, nombre: "Combo Food Pizza", precio: 38000, categoria: "Pizzas", imagen: "combofood.jpg" },
        { id: 27, nombre: "Combo Gold Pizza", precio: 45000, categoria: "Pizzas", imagen: "goldpizza.jpg" },
        { id: 26, nombre: "Combo Mix Pizza", precio: 45000, categoria: "Pizzas", imagen: "tripizza.jpg" },
        { id: 25, nombre: "Combo Pepperoni", precio: 60000, categoria: "Pizzas", imagen: "combopepe.jpg" },
        { id: 18, nombre: "Doble Jamón y Queso", precio: 30000, categoria: "Pizzas", imagen: "pizza5.jpg" },
        { id: 19, nombre: "Doble Queso", precio: 35000, categoria: "Pizzas", imagen: "pizzaqueso.jpg" },
        { id: 30, nombre: "Hawaiana", precio: 30000, categoria: "Pizzas", imagen: "hawaiana.jpg" },
        { id: 32, nombre: "Trio Especial", precio: 70000, categoria: "Pizzas", imagen: "trioespecial.jpg" },
        { id: 33, nombre: "Trio Pizza", precio: 40000, categoria: "Pizzas", imagen: "triopizzas.jpg" },
        { id: 67, nombre: "Triple Tentación", precio: 65000, categoria: "Pizzas", imagen: "tripletentacion.jpg" },
        { id: 77, nombre: "Burger Carne", precio: 12000, categoria: "Hamburguesas", imagen: "Hamb2.jpg" },
        { id: 81, nombre: "Burger Chuleta", precio: 18000, categoria: "Hamburguesas", imagen: "Hamb6.jpg" },
        { id: 80, nombre: "Burger Mixta", precio: 18000, categoria: "Hamburguesas", imagen: "Hamb5.jpg" },
        { id: 78, nombre: "Burger Pollo", precio: 12000, categoria: "Hamburguesas", imagen: "Hamb4.jpg" },
        { id: 79, nombre: "Burger doble carne", precio: 18000, categoria: "Hamburguesas", imagen: "Hamb3.jpg" },
        { id: 69, nombre: "Agua Mineral", precio: 3000, categoria: "Bebidas", imagen: "bebida7.jpg" },
        { id: 72, nombre: "Cerveza Lata", precio: 4000, categoria: "Bebidas", imagen: "bebida10.jpg" },
        { id: 85, nombre: "CocaCola 1.5 Lt", precio: 6000, categoria: "Bebidas", imagen: "cocacolalitron.jpg" },
        { id: 86, nombre: "Gaseosa Personal", precio: 3000, categoria: "Bebidas", imagen: "cocacolapersonal.jpg" },
        { id: 70, nombre: "Gaseosas 1.5", precio: 4500, categoria: "Bebidas", imagen: "hipinto.jpg" },
        { id: 99, nombre: "Malta Lata", precio: 3000, categoria: "Bebidas", imagen: "9.jpg" },
        { id: 1, nombre: "Pepsi 2 Lts", precio: 5500, categoria: "Bebidas", imagen: "bebida6.jpg" },
        { id: 84, nombre: "Pepsi Litro y Medio", precio: 4500, categoria: "Bebidas", imagen: "pepsilitron.jpg" },
        { id: 87, nombre: "Red Bull 250", precio: 7000, categoria: "Bebidas", imagen: "redbull.jpg" },
        { id: 110, nombre: "Cachito", precio: 5000, categoria: "Extras", imagen: "cahito.jpg" },
        { id: 104, nombre: "Caraotas/Queso", precio: 3000, categoria: "Extras", imagen: "empCaraotaqueso.jpg" },
        { id: 108, nombre: "Jamon/Queso", precio: 3000, categoria: "Extras", imagen: "empJamonQueso.jpg" },
        { id: 101, nombre: "Mechada", precio: 3000, categoria: "Extras", imagen: "empMechada.jpg" },
        { id: 102, nombre: "Mechada-Queso", precio: 3000, categoria: "Extras", imagen: "EmpMechadaqueso.jpg" },
        { id: 111, nombre: "Mini Pan", precio: 6000, categoria: "Extras", imagen: "minipan.jpg" },
        { id: 105, nombre: "Molida", precio: 3000, categoria: "Extras", imagen: "empMolida.jpg" },
        { id: 103, nombre: "Pabellon", precio: 4000, categoria: "Extras", imagen: "empPabellon.jpg" },
        { id: 109, nombre: "Pollo", precio: 3000, categoria: "Extras", imagen: "empPollo.jpg" },
        { id: 107, nombre: "Queso", precio: 3000, categoria: "Extras", imagen: "empQuso.jpg" },
        { id: 106, nombre: "Salch/Queso", precio: 3000, categoria: "Extras", imagen: "empSalchichasQueso.jpg" }
    ];
}
