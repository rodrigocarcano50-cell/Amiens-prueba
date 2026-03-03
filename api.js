// Cuando está en producción (Vercel), las rutas /api/... están en el mismo dominio.
// En desarrollo local con `vercel dev` también funciona igual.
const API_URL = '';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

async function handleApiResponse(response) {
    const data = await response.json();

    if (data.error === 'El token ha expirado') {
        showToast(data.mensaje || 'La sesión ha expirado', 'error');
        cerrarSesion();
        throw new Error('Token expirado');
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Error en la solicitud');
    }

    return data;
}

const api = {

    verifyToken: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;
            const response = await fetch(`${API_URL}/api/auth/islogged`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return response.ok;
        } catch (error) {
            console.error('Error verifying token:', error);
            return false;
        }
    },

    login: async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error('Credenciales incorrectas');
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            return data;
        } catch (error) {
            console.error('Error al iniciar sesión:', error.message);
        }
    },

    fetchProductos: async () => {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await handleApiResponse(response);
    },

    createProducto: async (data) => {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    updateProducto: async (id, data) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    deleteProducto: async (id) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return await handleApiResponse(response);
    },

    fetchExtracciones: async () => {
        const response = await fetch(`${API_URL}/api/extracciones`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await handleApiResponse(response);
    },

    createExtraccion: async (data) => {
        const response = await fetch(`${API_URL}/api/extracciones`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    deleteExtraccion: async (id, data = {}) => {
        const response = await fetch(`${API_URL}/api/extracciones/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    fetchIngresos: async () => {
        const response = await fetch(`${API_URL}/api/ingresos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await handleApiResponse(response);
    },

    createIngreso: async (data) => {
        const response = await fetch(`${API_URL}/api/ingresos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    deleteIngreso: async (id, data) => {
        const response = await fetch(`${API_URL}/api/ingresos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await handleApiResponse(response);
    },

    getUsuarios: async () => {
        const response = await fetch(`${API_URL}/api/auth/usuarios`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        return await handleApiResponse(response);
    }
};

window.cerrarSesion = () => {
    const boton = document.getElementById('btn-iniciar-sesion');
    boton.disabled = false;
    boton.textContent = 'Iniciar sesión';
    boton.style.cursor = 'pointer';
    boton.style.backgroundColor = '#3498db';
    localStorage.removeItem('token');
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
};

window.api = api;
