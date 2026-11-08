// 1. Tus credenciales de Supabase
const SUPABASE_URL = 'https://eeapyvpcsyngnqzlqgvb.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_FLFlDnyJKB5SERnjsDk53g_KlmZIgQT';

// Nota importante: El SDK oficial de Supabase espera la URL base del proyecto sin la ruta '/rest/v1/' al final.
// La URL correcta para el cliente es: https://eeapyvpcsyngnqzlqgvb.supabase.co
const CLEAN_SUPABASE_URL = 'https://eeapyvpcsyngnqzlqgvb.supabase.co';

// 2. Inicializar el cliente de Supabase
const supabaseClient = supabase.createClient(CLEAN_SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Escuchar el clic del botón de pedido en tu página web
document.getElementById('orderBtn').addEventListener('click', async function() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = "Enviando pedido a la nube...";
    statusDiv.style.color = "#007bff";

    try {
        // 4. Insertar los datos en la tabla llamada 'pedidos'
        // Asegúrate de haber creado una tabla llamada 'pedidos' en tu panel de Supabase con columnas 'producto' y 'estado'
        const { data, error } = await supabaseClient
            .from('pedidos')
            .insert([
                { producto: 'Medio Broaster', estado: 'Pendiente' }
            ]);

        if (error) {
            throw error;
        }

        statusDiv.textContent = "¡Pedido enviado con éxito y guardado en Supabase!";
        statusDiv.style.color = "#28a745";
        
    } catch (error) {
        console.error('Error al guardar el pedido:', error.message);
        statusDiv.textContent = "Hubo un error al enviar el pedido: " + error.message;
        statusDiv.style.color = "#dc3545";
    }
});
