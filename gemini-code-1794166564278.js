// 1. Inicializar Supabase con tus credenciales
const SUPABASE_URL = 'TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Escuchar el clic del botón de pedido
document.getElementById('orderBtn').addEventListener('click', async function() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = "Enviando pedido a la nube...";
    statusDiv.style.color = "#007bff";

    try {
        // 3. Insertar el registro en la tabla 'pedidos' de Supabase
        const { data, error } = await supabaseClient
            .from('pedidos')
            .insert([
                { producto: 'Pollo a la Broaster (Pieza)', estado: 'Pendiente' }
            ]);

        if (error) {
            throw error;
        }

        statusDiv.textContent = "¡Pedido enviado con éxito y guardado en Supabase!";
        statusDiv.style.color = "#28a745";
        
    } catch (error) {
        console.error('Error al guardar el pedido:', error.message);
        statusDiv.textContent = "Hubo un error al enviar el pedido.";
        statusDiv.style.color = "#dc3545";
    }
});