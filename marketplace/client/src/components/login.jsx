import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./login.css";
import Helper from "../components/Helper";
import { useAuth } from '../context/AuthContext'; // <--- ¡MUY IMPORTANTE!
import loginImage from '../images/lpm1.png';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [robotMessage, setRobotMessage] = useState("¡Hola! Bienvenido 👋");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const navigate = useNavigate();
  // 1. OBTENEMOS LA FUNCIÓN 'login' DEL CONTEXTO Y EL ESTADO
  const { login, isAuthenticated, loading: authLoading } = useAuth(); 

  // PROTECCIÓN: Si ya está autenticado, redirigir a Home y reemplazar el historial
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setRobotMessage("Ingresa tu correo y contraseña"), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email).trim().toLowerCase(),
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data?.error || "Credenciales inválidas");
        setRobotMessage("Credenciales inválidas. Inténtalo otra vez.");
        setLoading(false);
        return;
      }

      // --- 2. ¡ESTA ES LA LÍNEA CLAVE QUE ARREGLA EL NAVBAR! ---
      // Usamos el contexto para avisarle a toda la app que iniciamos sesión.
      login(data.user, data.token);
      // --------------------------------------------------------

      setRobotMessage(`¡Bienvenido, ${data.user.name}!`);
      
      // 3. Navegamos a "/home" con replace para evitar volver atrás
      navigate("/home", { replace: true }); 

    } catch (err) {
      setErrorMsg("Error de red. Verifica que la API esté corriendo en :4000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Columna Izquierda - Formulario */}
      <div className="login-page-left">
        <div className="login-container">
          <h2 className="login-title">Iniciar sesión</h2>
          <p className="subtitle">Ingresa email y contraseña para acceder a tu cuenta</p>
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {errorMsg && <p className="error-message">{errorMsg}</p>}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Validando..." : "Acceder"}
            </button>
          </form>

          <div className="links">
            <Link to="/forgot-password" className="forgot-password">¿Olvidaste tu contraseña?</Link>
            <div>
              <span className="signup-text">¿No tienes cuenta? </span>
              <Link to="/register" className="signup-link">Regístrate Ahora.</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Columna Derecha - Robot e Imagen */}
      <div className="login-page-right">
        <img 
          src={loginImage} 
          alt="Login background" 
          className="login-background-image"
        />
        <Helper message={robotMessage} />
      </div>

      {/* Botón crear cuenta - Fixed */}
     { /*<Link to="/register" className="create-account">Crear cuenta</Link>*/ }
    </div>
  );
};

export default Login;