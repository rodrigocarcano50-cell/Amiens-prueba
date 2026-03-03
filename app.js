
// app.js
// Variables globales
let todosProductos = [];  // Almacena todos los productos
let todasExtracciones = []; // Almacena todas las extracciones
let timeoutBusqueda; // Para el debounce de búsqueda
let currentTab = 'productos'; // Pestaña activa
let productosParaExtraccion = []; // Almacena productos seleccionados para la extracción
let extraccionEditando = null; // Almacena la extracción que se está editando
let productoAgregar = null; // Almacena el producto seleccionado para agregar a la extracción
//INGRESOS
let todosIngresos = [];
let ingresoEditando = null;
let productosParaIngreso = [];
//USUARIOS
let usuarios = [];
let usuarioActual = null;

let inputBuscador = document.getElementById('buscador-productos-extraccion');

const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions-container');

async function isLoggedIn() {
    try {
        const isLoggedIn = await api.verifyToken();
        if (isLoggedIn) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('main-container').style.display = 'flex';
            switchTab('productos');
        } else {
            localStorage.removeItem('token'); // Limpiar token inválido si existe
            logout();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        localStorage.removeItem('token');
    }
}

async function login() {
    const username = document.getElementById('username').value.toLowerCase();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const error = document.getElementById('error-text');
    const boton = document.getElementById('btn-iniciar-sesion');
    try {
        boton.disabled = true;
        boton.textContent = 'Iniciando sesión...';
        boton.style.cursor = 'not-allowed';
        boton.style.backgroundColor = '#ccc';
        const data = await api.login(username, password);
        if (!data) {
            errorMessage.style.display = 'block';
            error.textContent = 'Usuario o contraseña incorrectos';
            username.value = '';
            password.value = '';
            boton.disabled = false;
            boton.textContent = 'Iniciar sesión';
            boton.style.cursor = 'pointer';
            boton.style.backgroundColor = '#3498db';
        } else {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('main-container').style.display = 'flex';
            switchTab('productos');
        }
    } catch (error) {
        console.log(error.message);
    }
}

function logout() {
    const boton = document.getElementById('btn-iniciar-sesion');
    boton.disabled = false;
    boton.textContent = 'Iniciar sesión';
    boton.style.cursor = 'pointer';
    boton.style.backgroundColor = '#3498db';
    localStorage.removeItem('token')
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}


function formatoFecha(fechaISO) {
    const fecha = new Date(fechaISO);

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const anio = fecha.getFullYear();

    const fechaFormateada = `${dia}/${mes}/${anio}`;
    return fechaFormateada;
}

function mostrarSpinner() {
    const activeTab = document.getElementById(`${currentTab}-tab`);
    const spinnerContainer = activeTab.querySelector('.spinner-container');

    // Limpiamos spinners existentes
    const existingOverlay = spinnerContainer.querySelector('.spinner-overlay');
    const existingWrapper = spinnerContainer.querySelector('.spinner-wrapper');
    if (existingOverlay) spinnerContainer.removeChild(existingOverlay);
    if (existingWrapper) spinnerContainer.removeChild(existingWrapper);

    // Creamos overlay
    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    spinnerContainer.appendChild(overlay);

    // Creamos spinner wrapper
    const spinnerWrapper = document.createElement('div');
    spinnerWrapper.className = 'spinner-wrapper';
    spinnerWrapper.innerHTML = '<div class="spinner"></div>';

    // Calculamos posición relativa al tablero
    const tabRect = spinnerContainer.getBoundingClientRect();
    spinnerWrapper.style.left = `${tabRect.left + tabRect.width / 2}px`;
    spinnerWrapper.style.top = '50%';

    document.body.appendChild(spinnerWrapper);
}

function ocultarSpinner() {
    const activeTab = document.getElementById(`${currentTab}-tab`);
    const spinnerContainer = activeTab.querySelector('.spinner-container');
    const overlay = spinnerContainer.querySelector('.spinner-overlay');
    const wrapper = document.querySelector('.spinner-wrapper');

    if (overlay) spinnerContainer.removeChild(overlay);
    if (wrapper) document.body.removeChild(wrapper);
}

function deshabilitarBotonesModal(modalId) {
    const modal = document.getElementById(modalId);
    const buttons = modal.querySelectorAll('submit, button, input[type="sumbit"]');
    buttons.forEach(button => {
        button.disabled = true;
        button.style.cursor = 'not-allowed';
    });
}

function habilitarBotonesModal(modalId) {
    const modal = document.getElementById(modalId);
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = false;
        button.style.cursor = 'pointer';
    });
}

// Sistema de pestañas
function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = tab.id === `${tabName}-tab` ? 'block' : 'none';
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (tabName === 'productos') loadProductos();
    if (tabName === 'extracciones') loadExtracciones();
    if (tabName === 'ingresos') loadIngresos();
}

/*------------------------------*/
/*FUNCIONES DE PRODUCTOS*/
/*------------------------------*/
async function loadProductos() {
    mostrarSpinner();
    try {
        todosProductos = await api.fetchProductos();
        todosProductos = ordenarProductosPorDescripcion(); // Ordenar productos por descripción
        renderizarProductos(todosProductos);
    } catch (error) {
        console.error('Error cargando productos:', error);
    } finally {
        ocultarSpinner(); // 👈 Ocultar spinner aunque haya error
    }
}

function ordenarProductosPorDescripcion() {
    return todosProductos.sort((a, b) => {
        const descA = a.descripcion.toLowerCase();
        const descB = b.descripcion.toLowerCase();
        return descA.localeCompare(descB);
    });
}

function renderizarProductos(productos) {
    const tbody = document.getElementById('productos-lista');
    tbody.innerHTML = '';

    productos.forEach(producto => {
        const estado = producto.estado || 'N/A';
        const estadoClass = estado.toLowerCase().replace(' ', '-');
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${producto.descripcion}</td>
            <td>${producto.categoria}</td>
            <td>${producto.proveedor || 'N/A'}</td>
            <td>${producto.stock}</td>
            <td>${producto.stock_minimo}</td>
            <td class="${estadoClass}">${estado}</td>
        `;
        tbody.appendChild(row);
        row.addEventListener('click', () => mostrarFormularioProducto(producto));
    });
}

function filtrarProductosExtracion() {
    const termino = document.getElementById('buscador-productos-extraccion').value.toLowerCase();
    const filtrados = todosProductos.filter(p => {
        // Filtro por texto de búsqueda
        const coincideTexto =
            p.descripcion.toLowerCase().includes(termino) ||
            (p.categoria && p.categoria.toLowerCase().includes(termino)) ||
            (p.proveedor && p.proveedor.toLowerCase().includes(termino));

        // Filtro por estado
        const coincideEstado =
            estadoSeleccionado === 'todos' ||
            (p.estado && p.estado.toLowerCase().replace(' ', '-') === estadoSeleccionado);

        return coincideTexto && coincideEstado;
    });
    renderizarProductosExtraccion(filtrados);
}

function renderizarProductosExtraccion(productos) {
    const listaResultados = document.getElementById('resultados-productos-extraccion');

    productos.forEach(producto => {
        const li = document.createElement('li');
        li.textContent = producto.nombre;

        li.addEventListener('click', () => {
            inputBuscador.value = producto.nombre;
            listaResultados.innerHTML = ''; // Oculta los resultados
            // 👇 Llamá tu función acá
            productoAgregar = producto; // Guardar el producto seleccionado
        });

        listaResultados.appendChild(li);
    });
}

function filtrarProductos() {
    const termino = document.getElementById('buscador-productos').value.toLowerCase();
    const estadoSeleccionado = document.getElementById('verificarStock').value;

    const filtrados = todosProductos.filter(p => {
        // Filtro por texto de búsqueda
        const coincideTexto =
            p.descripcion.toLowerCase().includes(termino) ||
            (p.categoria && p.categoria.toLowerCase().includes(termino)) ||
            (p.proveedor && p.proveedor.toLowerCase().includes(termino));

        // Filtro por estado
        const coincideEstado =
            estadoSeleccionado === 'todos' ||
            (p.estado && p.estado.toLowerCase().replace(' ', '-') === estadoSeleccionado);

        return coincideTexto && coincideEstado;
    });

    renderizarProductos(filtrados);
}


function mostrarFormularioProducto(producto = null) {
    const modal = document.getElementById('producto-modal');
    const form = document.getElementById('producto-form');
    const title = document.getElementById('modal-title');
    const btnEliminar = document.getElementById('btn-eliminar-producto');
    const botones = document.querySelector('.form-actions');

    if (producto) {
        // Modo edición
        title.textContent = producto.descripcion;
        document.getElementById('producto-id').value = producto.id;
        document.getElementById('descripcion').value = producto.descripcion;
        document.getElementById('stock').value = producto.stock;
        document.getElementById('stock_minimo').value = producto.stock_minimo;
        document.getElementById('proveedor').value = producto.proveedor || '';
        document.getElementById('categoria').value = producto.categoria || '';
        btnEliminar.style.display = 'block';
        botones.style.justifyContent = 'space-between';
    } else {
        // Modo nuevo producto
        title.textContent = 'Nuevo Producto';
        form.reset();
        document.getElementById('producto-id').value = '';
        btnEliminar.style.display = 'none';
        botones.style.justifyContent = 'flex-end';
    }

    modal.style.display = 'block';
}

// Función para guardar el producto (nuevo o editado)
async function guardarProducto(event) {
    event.preventDefault();
    let productoId = document.getElementById('producto-id').value;
    const btnGuardar = event.target.querySelector('button[type="submit"]');
    
    // Deshabilitar botón y cambiar apariencia
    btnGuardar.disabled = true;
    btnGuardar.style.backgroundColor = '#ccc';
    btnGuardar.style.cursor = 'not-allowed';
    btnGuardar.style.opacity = '0.6';
    btnGuardar.textContent = 'Guardando...';
    
    try {
        if (productoId) {
            const productoData = {
                id: parseInt(document.getElementById('producto-id').value),
                descripcion: document.getElementById('descripcion').value,
                stock: parseInt(document.getElementById('stock').value),
                stock_minimo: parseInt(document.getElementById('stock_minimo').value),
                proveedor: document.getElementById('proveedor').value || '-',
                categoria: document.getElementById('categoria').value || '-'
            };
            await api.updateProducto(productoData.id, productoData);
        } else {
            const productoDataSinID = {
                descripcion: document.getElementById('descripcion').value,
                stock: parseInt(document.getElementById('stock').value),
                stock_minimo: parseInt(document.getElementById('stock_minimo').value),
                proveedor: document.getElementById('proveedor').value || '-',
                categoria: document.getElementById('categoria').value || '-'
            };
            await api.createProducto(productoDataSinID);
        }
        showToast('Producto guardado correctamente', 'success');
        cerrarModal();
        await loadProductos(); // Recargar la lista
    } catch (error) {
        console.error('Error guardando producto:', error);
        showToast('Error al guardar el producto', 'error');
    } finally {
        // Rehabilitar botón y restaurar apariencia
        btnGuardar.disabled = false;
        btnGuardar.style.backgroundColor = '';
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.style.opacity = '1';
        btnGuardar.textContent = 'Guardar';
    }
}

async function eliminarProducto(event) {
    event.preventDefault();
    let productoId = document.getElementById('producto-id').value;
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        try {
            await api.deleteProducto(productoId);
            showToast('Producto eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
        }
        cerrarModal();
        await loadProductos(); // Recargar la lista
    }
}

// Función para cerrar el modal
function cerrarModal() {
    if (currentTab === 'productos') {
        document.getElementById('producto-modal').style.display = 'none';
        document.getElementById('producto-id').value = '';
    } else if (currentTab === 'extracciones') {
        document.getElementById('extraccion-modal').style.display = 'none';
        extraccionEditando = null;
    } else {
        document.getElementById('ingreso-modal').style.display = 'none';
        ingresoEditando = null;
    }

}

/*-----------------------*/
/*FUNCIONES EXTRACCIONES*/
/*-----------------------*/

async function loadExtracciones() {
    mostrarSpinner();
    try {
        todasExtracciones = await api.fetchExtracciones();
        todasExtracciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        usuarios = await api.getUsuarios();
        renderizarExtracciones(todasExtracciones);
    } catch (error) {
        console.error('Error cargando extracciones:', error);
    } finally {
        ocultarSpinner(); // 👈 Ocultar spinner aunque haya error
    }
}

function filtrarExtracciones() {
    const termino = document.getElementById('buscador-extracciones').value.toLowerCase();
    const filtroFechaExtraccion = document.getElementById('filtroFechaExtraccion').value;
    const hoy = new Date();

    const filtradas = todasExtracciones.filter(extraccion => {
        // Filtro por texto en descripción
        const coincideTexto = extraccion.descripcion.toLowerCase().includes(termino);

        // Filtro por usuario
        const usuario = usuarios.find(u => u.id == extraccion.usuario_id);
        const nombreUsuario = usuario ? usuario.username.toLowerCase() : '';
        const coincideUsuario = nombreUsuario.includes(termino);

        // Filtro por fecha (si el término es numérico)
        const esNumero = !isNaN(termino) && termino !== '';
        const fechaExtraccion = new Date(extraccion.fecha);
        const diaExtraccion = fechaExtraccion.getDate().toString();
        const mesExtraccion = (fechaExtraccion.getMonth() + 1).toString();
        const anioExtraccion = fechaExtraccion.getFullYear().toString();

        let coincideFechaNumero = false;
        if (esNumero) {
            coincideFechaNumero =
                diaExtraccion.includes(termino) ||
                mesExtraccion.includes(termino) ||
                anioExtraccion.includes(termino);
        }

        // Filtro por rango de fecha seleccionado
        let coincideRangoFecha = true;
        if (filtroFechaExtraccion === 'hoy') {
            coincideRangoFecha = fechaExtraccion.toDateString() === hoy.toDateString();
        } else if (filtroFechaExtraccion === 'semana') {
            const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
            coincideRangoFecha = fechaExtraccion >= inicioSemana;
        } else if (filtroFechaExtraccion === 'mes') {
            coincideRangoFecha = fechaExtraccion.getMonth() === hoy.getMonth() &&
                fechaExtraccion.getFullYear() === hoy.getFullYear();
        }

        return (coincideTexto || coincideUsuario || (esNumero && coincideFechaNumero)) && coincideRangoFecha;
    });

    renderizarExtracciones(filtradas);
}

function renderizarExtracciones(extracciones) {
    const tbody = document.getElementById('extracciones-lista');
    tbody.innerHTML = '';

    extracciones.forEach(extraccion => {
        const row = document.createElement('tr');
        const fecha = new Date(extraccion.fecha).toLocaleDateString();
        const totalItems = extraccion.detalles.reduce((sum, d) => sum + d.cantidad, 0);
        const productos = extraccion.detalles.map(d => todosProductos.find(p => p.id === d.producto_id)?.descripcion || `Producto ${d.producto_id}`).join(', ');
        const usuario = usuarios.find(u => u.id == extraccion.usuario_id);
        const nombreUsuario = usuario ? `${usuario.username}` : 'N/A';
        row.innerHTML = `
            <td>${fecha}</td>
            <td>${extraccion.descripcion || 'Sin descripción'}</td>
            <td>${productos}</td>
            <td>${totalItems}</td>
            <td>${nombreUsuario}</td>
        `;
        tbody.appendChild(row);
        row.addEventListener('click', () => abrirModalExtraccion(extraccion));
    });
}

// Función para abrir el modal
async function abrirModalExtraccion(extraccion = null) {
    extraccionEditando = extraccion;
    const modal = document.getElementById('extraccion-modal');
    const title = document.getElementById('modal-extraccion-title');


    if (extraccion) {
        const usuario = usuarios.find(u => u.id == extraccion.usuario_id);
        const nombreUsuario = usuario ? `${usuario.username}` : 'N/A';
        title.textContent = `Extracción: ${extraccion.descripcion} (${formatoFecha(extraccion.fecha)}) - ${nombreUsuario}`;
        document.getElementById('extraccion-descripcion-container').style.display = 'none';
        document.getElementById('agregar-producto-container').style.display = 'none';
        document.getElementById('extraccion-id').value = extraccion.id;
        productosParaExtraccion = extraccion.detalles.map(d => ({
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            producto_descripcion: d.producto_descripcion || `Producto ${d.producto_id}`,
            stock: d.producto_stock || 0
        }));
        document.getElementById('acciones-header').style.display = 'none';
        document.getElementById('guardar-extraccion').style.display = 'none';
        document.getElementById('btn-eliminar-producto-extraccion').style.display = 'block';
        document.getElementById('form-actions-extraccion').style.justifyContent = 'space-between';
    } else {
        title.textContent = 'Nueva Extracción';
        document.getElementById('extraccion-descripcion-container').style.display = 'block';
        document.getElementById('agregar-producto-container').style.display = 'flex';
        document.getElementById('acciones-header').style.display = 'block';
        document.getElementById('guardar-extraccion').style.display = 'block';
        document.getElementById('extraccion-descripcion').value = '';
        document.getElementById('btn-eliminar-producto-extraccion').style.display = 'none';
        document.getElementById('form-actions-extraccion').style.justifyContent = 'flex-end';
        productosParaExtraccion = [];
    }

    renderizarProductosEnExtraccion();
    modal.style.display = 'block';
}

// Renderizar productos en la tabla
function renderizarProductosEnExtraccion() {
    const tbody = document.getElementById('productos-extraccion-lista');
    tbody.innerHTML = '';

    productosParaExtraccion.forEach(item => {
        const producto = todosProductos.find(p => p.id === item.producto_id) || {};
        const tr = document.createElement('tr');
        const sinStock = producto.stock < item.cantidad;

        const accionesHTML = extraccionEditando
            ? '' // Si estás editando, no mostramos acciones
            : `
                <td>
                    <button class="btn-eliminar-producto" data-id="${item.producto_id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <button class="btn-editar-cantidad" data-id="${item.producto_id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V5A1,1,0,0,1,5,4h6a1,1,0,0,0,0-2H5A3,3,0,0,0,2,5V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12ZM6,12.76V17a1,1,0,0,0,1,1h4.24a1,1,0,0,0,.71-.29l6.92-6.93h0L21.71,8a1,1,0,0,0,0-1.42L17.47,2.29a1,1,0,0,0-1.42,0L13.23,5.12h0L6.29,12.05A1,1,0,0,0,6,12.76ZM16.76,4.41l2.83,2.83L18.17,8.66,15.34,5.83ZM8,13.17l5.93-5.93,2.83,2.83L10.83,16H8Z"></path></svg>
                    </button>
                </td>
            `;

        tr.innerHTML = `
            <td>${producto.descripcion}</td>
            <td>${item.cantidad}</td>
            <td class="${sinStock ? 'sin-stock-suficiente' : ''}">
                ${producto.stock !== undefined ? producto.stock : 'N/A'}
            </td>
            ${accionesHTML}
        `;

        tbody.appendChild(tr);
    });

    // Agregar event listeners a los botones
    document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productoId = parseInt(btn.dataset.id);
            productosParaExtraccion = productosParaExtraccion.filter(p => p.producto_id !== productoId);
            renderizarProductosEnExtraccion();
        });
    });

    document.querySelectorAll('.btn-editar-cantidad').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productoId = parseInt(btn.dataset.id);
            const producto = productosParaExtraccion.find(p => p.producto_id === productoId);
            const nuevaCantidad = prompt('Ingrese nueva cantidad:', producto.cantidad);

            if (nuevaCantidad && !isNaN(nuevaCantidad)) {
                producto.cantidad = parseInt(nuevaCantidad);
                renderizarProductosEnExtraccion();
            }
        });
    });
}

// Guardar extracción
async function guardarExtraccion() {
    const descripcion = document.getElementById('extraccion-descripcion').value;
    const btnGuardar = document.getElementById('guardar-extraccion');

    if (!descripcion) {
        alert('Por favor ingrese una descripción');
        return;
    }

    if (productosParaExtraccion.length === 0) {
        alert('Debe agregar al menos un producto');
        return;
    }

    // Deshabilitar botón y cambiar apariencia
    btnGuardar.disabled = true;
    btnGuardar.style.backgroundColor = '#ccc';
    btnGuardar.style.cursor = 'not-allowed';
    btnGuardar.style.opacity = '0.6';
    btnGuardar.textContent = 'Guardando...';

    const data = {
        descripcion,
        productos: productosParaExtraccion.map(p => ({
            producto_id: p.producto_id,
            cantidad: p.cantidad
        }))
    };

    try {
        await api.createExtraccion(data);
        showToast('Extracción guardada correctamente', 'success');
        cerrarModal();
        await loadExtracciones();
    } catch (error) {
        console.error('Error guardando extracción:', error);
        alert('Error al guardar la extracción: ' + (error.message || 'Verifique los datos'));
    } finally {
        // Rehabilitar botón y restaurar apariencia
        btnGuardar.disabled = false;
        btnGuardar.style.backgroundColor = '';
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.style.opacity = '1';
        btnGuardar.textContent = 'Guardar';
    }
}

// Eliminar extracción (desde la lista principal)
async function eliminarExtraccion(event) {
    const extraccionId = document.getElementById('extraccion-id').value;
    if (confirm('¿Está seguro de que desea eliminar esta extracción?')) {
        if (confirm('¿Quiere devolver los productos al stock?')) {
            data = { 'devolver': 1 };
        } else {
            data = { 'devolver': 0 };
        }
        try {
            await api.deleteExtraccion(extraccionId, data);
            showToast('Extracción eliminada correctamente', 'success');
            await loadExtracciones(); // Recargar la lista
        } catch (error) {
            console.error('Error eliminando extracción:', error);
            alert('Error al eliminar la extracción: ' + (error.message || 'Intente nuevamente'));
        }
        cerrarModal();
        await loadExtracciones(); // Recargar la lista
    }

}

// Función para agregar producto
function agregarProductoAExtraccion() {
    const input = document.getElementById('search-input');
    const cantidadInput = document.getElementById('producto-cantidad');
    const productoId = productoAgregar.id; // Asumiendo que productoAgregar es el objeto del producto seleccionado
    const cantidad = parseInt(cantidadInput.value);

    if (!productoId || isNaN(cantidad) || cantidad <= 0) {
        alert('Seleccione un producto y una cantidad válida');
        return;
    }
    const producto = todosProductos.find(p => p.id === productoId);

    // Verificar si ya existe
    const existeIndex = productosParaExtraccion.findIndex(p => p.producto_id === productoId);

    if (cantidad > producto.stock) {
        showToast('Stock insuficiente, actual: ' + productoAgregar.stock, 'error');
        return;
    }

    if (existeIndex >= 0) {
        // Actualizar cantidad si ya existe
        productosParaExtraccion[existeIndex].cantidad += cantidad;
    } else {
        // Agregar nuevo
        productosParaExtraccion.push({
            producto_id: productoId,
            cantidad: cantidad,
            producto_descripcion: producto.descripcion,
            stock: producto.stock
        });
    }

    renderizarProductosEnExtraccion();
    input.value = '';
    cantidadInput.value = 1;
}

function showSuggestions(products) {
    const container = document.getElementById('suggestions-container');
    container.innerHTML = '';

    if (products.length === 0) {
        container.style.display = 'none';
        return;
    }

    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = product.descripcion;

        div.addEventListener('click', () => {
            document.getElementById('search-input').value = product.descripcion;
            container.style.display = 'none';
            productoAgregar = product;
        });

        container.appendChild(div);
    });

    container.style.display = 'block';
}


/*-----------------------*/
/*FUNCIONES INGRESOS*/
/*-----------------------*/

async function loadIngresos() {
    mostrarSpinner();
    try {
        todosIngresos = await api.fetchIngresos();
        todosIngresos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        usuarios = await api.getUsuarios();
        renderizarIngresos(todosIngresos);
    } catch (error) {
        console.error('Error cargando ingresos:', error);
    } finally {
        ocultarSpinner(); // 👈 Ocultar spinner aunque haya error
    }
}

function renderizarIngresos(ingresos) {
    const tbody = document.getElementById('ingresos-lista');
    tbody.innerHTML = '';

    ingresos.forEach(ingreso => {
        const row = document.createElement('tr');
        const fecha = new Date(ingreso.fecha).toLocaleDateString();
        const totalItems = ingreso.detalles.reduce((sum, d) => sum + d.cantidad, 0);
        const productos = ingreso.detalles.map(d => todosProductos.find(p => p.id === d.producto_id)?.descripcion || `Producto ${d.producto_id}`).join(', ');
        const usuario = usuarios.find(u => u.id == ingreso.usuario_id);
        const nombreUsuario = usuario ? `${usuario.username}` : 'N/A';
        row.innerHTML = `
            <td>${fecha}</td>
            <td>${productos}</td>
            <td>${totalItems}</td>
            <td>${nombreUsuario}</td
        `;
        tbody.appendChild(row);
        row.addEventListener('click', () => abrirModalIngreso(ingreso));
    });
}

function filtrarIngresos() {
    const termino = document.getElementById('buscador-ingresos').value.toLowerCase();
    const filtroFechaIngreso = document.getElementById('filtroFechaIngreso').value;
    const hoy = new Date();

    const filtradas = todosIngresos.filter(ingreso => {
        // Filtro por usuario
        const usuario = usuarios.find(u => u.id == ingreso.usuario_id);
        const nombreUsuario = usuario ? usuario.username.toLowerCase() : '';
        const coincideUsuario = nombreUsuario.includes(termino);

        // Filtro por fecha (si el término es numérico)
        const esNumero = !isNaN(termino) && termino !== '';
        const fechaIngreso = new Date(ingreso.fecha);
        const diaIngreso = fechaIngreso.getDate().toString();
        const mesIngreso = (fechaIngreso.getMonth() + 1).toString();
        const anioIngreso = fechaIngreso.getFullYear().toString();

        let coincideFechaNumero = false;
        if (esNumero) {
            coincideFechaNumero =
                diaIngreso.includes(termino) ||
                mesIngreso.includes(termino) ||
                anioIngreso.includes(termino);
        }

        // Filtro por rango de fecha seleccionado
        let coincideRangoFecha = true;
        if (filtroFechaIngreso === 'hoy') {
            coincideRangoFecha = fechaIngreso.toDateString() === hoy.toDateString();
        } else if (filtroFechaIngreso === 'semana') {
            const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
            coincideRangoFecha = fechaIngreso >= inicioSemana;
        } else if (filtroFechaIngreso === 'mes') {
            coincideRangoFecha = fechaIngreso.getMonth() === hoy.getMonth() &&
                fechaIngreso.getFullYear() === hoy.getFullYear();
        }

        return (coincideUsuario || (esNumero ? coincideFechaNumero : true)) && coincideRangoFecha;
    });

    renderizarIngresos(filtradas);
}

async function abrirModalIngreso(ingreso = null) {
    ingresoEditando = ingreso;
    const modal = document.getElementById('ingreso-modal');
    const title = document.getElementById('modal-ingreso-title');


    if (ingreso) {
        const usuario = usuarios.find(u => u.id == ingreso.usuario_id);
        const nombreUsuario = usuario ? `${usuario.username}` : 'N/A';
        title.textContent = `Ingreso: ${ingreso.descripcion || 'Sin descripción'} (${formatoFecha(ingreso.fecha)}) - ${nombreUsuario}`;
        document.getElementById('agregar-producto-container-ingreso').style.display = 'none';
        document.getElementById('ingreso-id').value = ingreso.id;
        productosParaIngreso = ingreso.detalles.map(d => ({
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            producto_descripcion: todosProductos.find(p => p.id === d.producto_id)?.descripcion || `Producto ${d.producto_id}`,
            stock: todosProductos.find(p => p.id === d.producto_id)?.stock || 0
        }));
        document.getElementById('acciones-header-ingreso').style.display = 'none';
        document.getElementById('guardar-ingreso').style.display = 'none';
        document.getElementById('btn-eliminar-ingreso').style.display = 'block';
        document.getElementById('form-actions-ingreso').style.justifyContent = 'space-between';
    } else {
        title.textContent = 'Nuevo Ingreso';
        document.getElementById('agregar-producto-container-ingreso').style.display = 'flex';
        document.getElementById('acciones-header-ingreso').style.display = 'block';
        document.getElementById('guardar-ingreso').style.display = 'block';
        document.getElementById('btn-eliminar-ingreso').style.display = 'none';
        document.getElementById('form-actions-ingreso').style.justifyContent = 'flex-end';
        productosParaIngreso = [];
    }

    renderizarProductosEnIngreso();
    modal.style.display = 'block';
}

function renderizarProductosEnIngreso() {
    const tbody = document.getElementById('productos-ingreso-lista');
    tbody.innerHTML = '';

    productosParaIngreso.forEach(item => {
        const producto = todosProductos.find(p => p.id === item.producto_id) || {};
        const tr = document.createElement('tr');

        const accionesHTML = ingresoEditando
            ? '' // Si estás editando, no mostramos acciones
            : `
                <td>
                    <button class="btn-eliminar-producto-ingreso" data-id="${item.producto_id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <button class="btn-editar-cantidad-ingreso" data-id="${item.producto_id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V5A1,1,0,0,1,5,4h6a1,1,0,0,0,0-2H5A3,3,0,0,0,2,5V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12ZM6,12.76V17a1,1,0,0,0,1,1h4.24a1,1,0,0,0,.71-.29l6.92-6.93h0L21.71,8a1,1,0,0,0,0-1.42L17.47,2.29a1,1,0,0,0-1.42,0L13.23,5.12h0L6.29,12.05A1,1,0,0,0,6,12.76ZM16.76,4.41l2.83,2.83L18.17,8.66,15.34,5.83ZM8,13.17l5.93-5.93,2.83,2.83L10.83,16H8Z"></path></svg>
                    </button>
                </td>
            `;

        tr.innerHTML = `
            <td>${producto.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>${producto.stock || 0}</td>
            ${accionesHTML}
        `;

        tbody.appendChild(tr);
    });

    // Agregar event listeners a los botones
    document.querySelectorAll('.btn-eliminar-producto-ingreso').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productoId = parseInt(btn.dataset.id);
            productosParaIngreso = productosParaIngreso.filter(p => p.producto_id !== productoId);
            renderizarProductosEnIngreso();
        });
    });

    document.querySelectorAll('.btn-editar-cantidad-ingreso').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productoId = parseInt(btn.dataset.id);
            const producto = productosParaIngreso.find(p => p.producto_id === productoId);
            const nuevaCantidad = prompt('Ingrese nueva cantidad:', producto.cantidad);

            if (nuevaCantidad && !isNaN(nuevaCantidad)) {
                producto.cantidad = parseInt(nuevaCantidad);
                renderizarProductosEnIngreso();
            }
        });
    });
}

function agregarProductoAIngreso() {
    const cantidadInput = document.getElementById('producto-cantidad-ingreso');
    const productoId = productoAgregar?.id;
    const cantidad = parseInt(cantidadInput.value);

    if (!productoId || isNaN(cantidad) || cantidad <= 0) {
        alert('Seleccione un producto y una cantidad válida');
        return;
    }

    const producto = todosProductos.find(p => p.id === productoId);

    const existeIndex = productosParaIngreso.findIndex(p => p.producto_id === productoId);

    if (existeIndex >= 0) {
        // Actualizar cantidad si ya existe
        productosParaIngreso[existeIndex].cantidad += cantidad;
    } else {
        // Agregar nuevo
        productosParaIngreso.push({
            producto_id: productoId,
            cantidad: cantidad,
            producto_descripcion: producto.descripcion,
            stock: producto.stock
        });
    }

    renderizarProductosEnIngreso();
    document.getElementById('search-input-ingreso').value = '';
    cantidadInput.value = 1;
}

async function guardarIngreso() {
    const btnGuardar = document.getElementById('guardar-ingreso');
    
    if (productosParaIngreso.length === 0) {
        alert('Agregue al menos un producto');
        return;
    }

    // Deshabilitar botón y cambiar apariencia
    btnGuardar.disabled = true;
    btnGuardar.style.backgroundColor = '#ccc';
    btnGuardar.style.cursor = 'not-allowed';
    btnGuardar.style.opacity = '0.6';
    btnGuardar.textContent = 'Guardando...';

    const data = {
        detalles: productosParaIngreso
    };

    try {
        await api.createIngreso(data);
        showToast('Ingreso guardado correctamente', 'success');
        cerrarModal();
        await loadIngresos();
    } catch (error) {
        alert('Error al guardar ingreso');
    } finally {
        // Rehabilitar botón y restaurar apariencia
        btnGuardar.disabled = false;
        btnGuardar.style.backgroundColor = '';
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.style.opacity = '1';
        btnGuardar.textContent = 'Guardar';
    }
}

async function eliminarIngreso() {
    const id = document.getElementById('ingreso-id').value;
    const btnEliminar = document.getElementById('btn-eliminar-ingreso');
    
    if (confirm('¿Está seguro de que desea eliminar este ingreso?')) {
        if (confirm('¿Quiere restar los productos al stock?')) {
            data = { 'devolver': 1 };
        } else {
            data = { 'devolver': 0 };
        }
        
        // Deshabilitar botón y cambiar apariencia
        btnEliminar.disabled = true;
        btnEliminar.style.backgroundColor = '#ccc';
        btnEliminar.style.cursor = 'not-allowed';
        btnEliminar.style.opacity = '0.6';
        
        try {
            await api.deleteIngreso(id, data);
            showToast('Ingreso eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando ingreso:', error);
            alert('Error al eliminar el ingreso: ' + (error.message || 'Intente nuevamente'));
        } finally {
            // Rehabilitar botón y restaurar apariencia
            btnEliminar.disabled = false;
            btnEliminar.style.backgroundColor = '';
            btnEliminar.style.cursor = 'pointer';
            btnEliminar.style.opacity = '1';
        }
        
        await loadIngresos();
        cerrarModal();
    }
}

function showSuggestionsForIngreso(products) {
    const container = document.getElementById('suggestions-container-ingreso');
    container.innerHTML = '';

    if (products.length === 0) {
        container.style.display = 'none';
        return;
    }

    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = product.descripcion;

        div.addEventListener('click', () => {
            document.getElementById('search-input-ingreso').value = product.descripcion;
            container.style.display = 'none';
            productoAgregar = product;
        });

        container.appendChild(div);
    });

    container.style.display = 'block';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {

    isLoggedIn();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        login();
    });

    document.getElementById('btn-logout').addEventListener('click', logout);

    // Sistema de pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    /*------------------------------*/
    //BUSCADOR , SELECT y nuevo producto
    // Búsqueda en tiempo real
    document.getElementById('buscador-productos').addEventListener('input', () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(filtrarProductos, 300);
    });

    // select para ver productos con stock
    document.getElementById('verificarStock').addEventListener('change', () => {
        document.getElementById('buscador-productos').value = ''; // Limpiar el input de búsqueda
        filtrarProductos()
    });

    // Resetear el select a "todos" cuando se escribe
    document.getElementById('buscador-productos').addEventListener('input', () => {
        document.getElementById('verificarStock').value = 'todos';
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(filtrarProductos, 300);
    });

    // Botón nuevo producto
    document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
        mostrarFormularioProducto();
    });

    //MODAL PRODUCTO
    //Botón guardar
    document.getElementById('producto-form').addEventListener('submit', guardarProducto);
    // Botón cancelar
    document.getElementById('cancelar-form').addEventListener('click', cerrarModal);
    // Cerrar al hacer clic en la X
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    //Cerrar al hacer clic fuera del modal
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('producto-modal');
        if (event.target === modal) {
            cerrarModal();
        }
        const modalExtraccion = document.getElementById('extraccion-modal');
        if (event.target === modalExtraccion) {
            cerrarModal();
        }
        const modalIngreso = document.getElementById('ingreso-modal');
        if (event.target === modalIngreso) {
            cerrarModal();
        }
    });
    document.getElementById('btn-eliminar-producto').addEventListener('click', eliminarProducto);

    /*-----------------*/
    //eventos EXTRACCIONES
    /*-----------------*/
    document.getElementById('filtroFechaExtraccion').addEventListener('change', filtrarExtracciones);

    document.getElementById('buscador-extracciones').addEventListener('input', () => {
        document.getElementById('filtroFechaExtraccion').value = 'todos';
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(filtrarExtracciones, 300);
    });

    /*MODAL EXTRACCIONES*/
    document.getElementById('btn-nueva-extraccion').addEventListener('click', () => abrirModalExtraccion());
    document.getElementById('btn-agregar-producto').addEventListener('click', agregarProductoAExtraccion);
    document.getElementById('guardar-extraccion').addEventListener('click', guardarExtraccion);
    document.getElementById('cancelar-extraccion').addEventListener('click', cerrarModal);
    document.getElementById("btn-eliminar-producto-extraccion").addEventListener('click', eliminarExtraccion);
    document.getElementById('close-modal-extraccion').addEventListener('click', cerrarModal);

    // Para editar desde la lista principal (añadir en DOMContentLoaded)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-editar-extraccion')) {
            const extraccionId = parseInt(e.target.closest('.btn-editar-extraccion').dataset.id);
            const extraccion = todasExtracciones.find(e => e.id === extraccionId);

            if (extraccion) {
                // Necesitamos cargar los detalles completos si no están
                if (!extraccion.detalles || extraccion.detalles.length === 0) {
                    const response = await fetch(`${API_URL}/extracciones/${extraccionId}`);
                    const data = await response.json();
                    extraccion.detalles = data.detalles;
                }

                await abrirModalExtraccion(extraccion);
            }
        }
    });

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        if (query === '') {
            const suggestionsList = document.getElementById('suggestions-list');
            suggestionsList.innerHTML = '';
            return;
        }

        if (query === '') {
            suggestionsList.style.display = 'none'; // 👈 OCULTAR
            return;
        }


        const filtered = todosProductos.filter(producto =>
            producto.descripcion.toLowerCase().includes(query)
        );

        showSuggestions(filtered);
    });
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() !== '' && suggestionsContainer.children.length > 0) {
            suggestionsContainer.style.display = 'block';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            suggestionsContainer.style.display = 'none';
        }
    });

    /*-----------------*/
    //eventos INGRESOS
    /*-----------------*/
    document.getElementById('search-input-ingreso').addEventListener('input', () => {
        const query = document.getElementById('search-input-ingreso').value.toLowerCase().trim();
        const container = document.getElementById('suggestions-container-ingreso');

        if (query === '') {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        const filtered = todosProductos.filter(producto =>
            producto.descripcion.toLowerCase().includes(query)
        );

        showSuggestionsForIngreso(filtered);
    });

    document.getElementById('search-input-ingreso').addEventListener('focus', () => {
        const input = document.getElementById('search-input-ingreso');
        const container = document.getElementById('suggestions-container-ingreso');

        if (input.value.trim() !== '' && container.children.length > 0) {
            container.style.display = 'block';
        }
    });


    document.getElementById('filtroFechaIngreso').addEventListener('change', filtrarIngresos);

    document.getElementById('buscador-ingresos').addEventListener('input', () => {
        document.getElementById('filtroFechaIngreso').value = 'todos';
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(filtrarIngresos, 300);
    });
    //Modal Ingresos
    document.getElementById('btn-nuevo-ingreso').addEventListener('click', () => abrirModalIngreso());
    document.getElementById('btn-agregar-producto-ingreso').addEventListener('click', agregarProductoAIngreso);
    document.getElementById('guardar-ingreso').addEventListener('click', guardarIngreso);
    document.getElementById('cancelar-ingreso').addEventListener('click', cerrarModal);
    document.getElementById('btn-eliminar-ingreso').addEventListener('click', eliminarIngreso);
    document.getElementById('close-modal-ingreso').addEventListener('click', cerrarModal);


});


/**
 * Muestra un toast de notificación
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast (success, error, warning, info)
 * @param {number} duration - Duración en milisegundos (opcional, default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;

    container.appendChild(toast);

    // Cerrar al hacer click en el botón
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    // Cierre automático
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
}
