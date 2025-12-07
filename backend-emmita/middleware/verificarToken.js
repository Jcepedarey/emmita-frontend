// backend/middleware/verificarToken.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const verificarToken = async (req, res, next) => {
  try {
    // 1. Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado - Token faltante' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // 3. Agregar usuario a request
    req.usuario = user;
    next();

  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

module.exports = verificarToken;