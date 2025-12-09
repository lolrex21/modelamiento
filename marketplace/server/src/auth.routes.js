import { Router } from "express";
import { supabase } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const isValidEmail = (email = "") => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// firmar token simple
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2d" }
  );
}

/**
 * POST /api/auth/register
 * body: { name, email, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { name, password, role } = req.body || {};
    const email = String(req.body.email || "").trim().toLowerCase();

    console.log("\n[DEBUG] /register: Recibido", {
      name,
      email,
      password: "***",
      role,
    });

    // 1) Validaciones básicas
    if (!name || !email || !password) {
      console.log("[DEBUG] /register: Faltan campos");
      return res.status(400).json({ error: "Faltan campos" });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "Correo electrónico no válido." });
    }

    // 2) Validar rol
    const validRoles = ["user", "buyer", "moderator", "admin"];
    const userRole = role && validRoles.includes(role) ? role : "user";

    // 3) Verificar si ya existe en tu tabla users
    const { data: existingUser, error: existsError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existsError) {
      console.error(
        "[DEBUG] /register: Error al verificar email en users:",
        existsError
      );
      return res.status(500).json({ error: "Error en el registro" });
    }

    if (existingUser) {
      console.log("[DEBUG] /register: El email ya existe en users");
      return res
        .status(409)
        .json({ error: "El email ya está registrado" });
    }

    // 4) Registrar en Supabase Auth (esto dispara el correo de confirmación)
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          // datos extra opcionales que se guardan en auth.users.user_metadata
          data: {
            name,
            role: userRole,
          },
          // URL a la que Supabase redirige después de que el usuario hace clic en el correo
          emailRedirectTo: FRONTEND_URL,
        },
      });

    if (signUpError) {
      console.error("[DEBUG] /register: Error en supabase.auth.signUp:", signUpError);
      // Si el correo ya existe en auth.users, normalmente devuelve error tipo "User already registered"
      return res.status(400).json({ error: signUpError.message });
    }

    const authUser = signUpData.user;
    console.log("[DEBUG] /register: Usuario creado en Auth:", authUser?.id);

    // 5) Hashear la contraseña para tu propia tabla (opcional, puedes no guardarla)
    const hash = await bcrypt.hash(password, 10);
    console.log("[DEBUG] /register: Hash de contraseña creado");

    // 6) Insertar en tu tabla users (status = 'inactive')
    // ajusta columnas según tu esquema (ej: auth_user_id si tienes FK a auth.users.id)
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          password_hash: hash,
          role: userRole,
          status: "inactive",
        },
      ])
      .select("id, name, email, created_at, role, status")
      .single();

    if (insertError) {
      console.error("[DEBUG] /register: Error al insertar en users:", insertError);
      return res.status(500).json({ error: "Error en el registro" });
    }

    console.log(
      "[DEBUG] /register: Usuario registrado con éxito en users. ID:",
      inserted.id
    );

    // 7) En lugar de loguearlo, avisas que revise su correo
    return res.status(201).json({
      message:
        "Registro exitoso. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
      user: inserted,
    });
  } catch (err) {
    console.error("[DEBUG] /register: Error 500", err);
    res.status(500).json({ error: "Error en el registro" });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body || {};
    const email = String(req.body.email || "").trim().toLowerCase();

    console.log("\n[DEBUG] /login: Intento de inicio de sesión con:", {
      email,
      password: "***",
    });

    if (!email || !password) {
      console.log("[DEBUG] /login: Faltan credenciales");
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    // 1) buscar usuario por email en Supabase
    const { data: user, error: foundError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (foundError) {
      console.error("[DEBUG] /login: Error al buscar usuario:", foundError);
      return res.status(500).json({ error: "Error en el login" });
    }

    if (!user) {
      console.log("[DEBUG] /login: Email no encontrado en la BD");
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    console.log("[DEBUG] /login: Usuario encontrado. ID:", user.id);
    console.log("[DEBUG] /login: Hash en BD:", user.password_hash);
    
    const ok = await bcrypt.compare(password, user.password_hash);
    console.log("[DEBUG] /login: ¿La contraseña es correcta?:", ok);

    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 3) verificar estado de la cuenta
    if (user.status !== "active") {
      console.log("[DEBUG] /login: La cuenta no está activa:", user.status);
      return res
        .status(403)
        .json({ error: "Debes confirmar tu correo para usar la app." });
      // o "La cuenta está suspendida.", según tu lógica
    }

    const token = signToken(user);
    const { password_hash, ...userResponse } = user;

    console.log("[DEBUG] /login: Login exitoso. Enviando token.");
    res.json({ token, user: userResponse });
  } catch (err) {
    console.error("[DEBUG] /login: Error 500", err);
    res.status(500).json({ error: "Error en el login" });
  }
});

// Recuperación de contraseña
import { forgotPassword, resetPassword } from './password.controller.js';

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

/**
 * GET /api/auth/verify
 * Verifica el token y devuelve los datos actualizados del usuario
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener datos actualizados del usuario desde la BD
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, status, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta suspendida' });
    }

    // Si el rol cambió, generar un nuevo token
    if (user.role !== decoded.role) {
      const newToken = signToken(user);
      return res.json({ token: newToken, user });
    }

    res.json({ user });
  } catch (err) {
    console.error('[DEBUG] /verify: Error', err);
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
