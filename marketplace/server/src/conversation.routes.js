// chat.routes.js
import { Router } from "express";
import { supabase } from "./db.js";

const router = Router();

const CONVERSATIONS_TABLE = "conversations";
const MESSAGES_TABLE = "messages";

/**
 * POST /api/chat/conversation
 * body: { userId, otherUserId }
 * Crea o devuelve la conversación entre esos 2 usuarios.
 */
router.post("/conversation", async (req, res) => {
  try {
    let { userId, otherUserId } = req.body || {};

    if (!userId || !otherUserId) {
      return res.status(400).json({ error: "Faltan userId u otherUserId" });
    }

    userId = Number(userId);
    otherUserId = Number(otherUserId);

    if (userId === otherUserId) {
      return res
        .status(400)
        .json({ error: "La conversación requiere 2 usuarios distintos" });
    }

    // siempre ordenamos el par (user1_id < user2_id)
    const [userA, userB] = [userId, otherUserId].sort((a, b) => a - b);

    // 1) buscar si ya existe la conversación (si hay duplicados, nos quedamos con la primera)
    const { data: existingRows, error: searchError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("*")
      .eq("user1_id", userA)
      .eq("user2_id", userB)
      .order("id", { ascending: true })
      .limit(1);

    if (searchError) {
      console.error("Error buscando conversación:", searchError);
      return res
        .status(500)
        .json({ error: "Error buscando conversación en la BD" });
    }

    const existing = existingRows?.[0];

    if (existing) {
      // ya existe → devolvemos
      return res.json({
        conversationId: existing.id,
        user1_id: existing.user1_id,
        user2_id: existing.user2_id,
        last_message_text: existing.last_message_text,
        last_message_at: existing.last_message_at,
      });
    }

    // 2) crear si no existe
    const { data: insertedRows, error: insertError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .insert([
        {
          user1_id: userA,
          user2_id: userB,
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error creando conversación:", insertError);
      return res.status(500).json({ error: "Error creando conversación" });
    }

    const inserted = insertedRows[0];

    return res.json({
      conversationId: inserted.id,
      user1_id: inserted.user1_id,
      user2_id: inserted.user2_id,
      last_message_text: inserted.last_message_text,
      last_message_at: inserted.last_message_at,
    });
  } catch (err) {
    console.error("Error en /conversation:", err);
    return res
      .status(500)
      .json({ error: "Error interno en /api/chat/conversation" });
  }
});

/**
 * GET /api/chat/conversations/:userId
 * Lista de conversaciones de un usuario.
 */
router.get("/conversations/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId inválido" });
    }

    const { data: convs, error: convError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (convError) {
      console.error("Error listando conversaciones:", convError);
      return res.status(500).json({ error: "Error listando conversaciones" });
    }

    if (!convs || convs.length === 0) {
      return res.json([]);
    }

    const otherIds = [];
    const convWithOther = convs.map((c) => {
      const otherUserId = c.user1_id === userId ? c.user2_id : c.user1_id;
      otherIds.push(otherUserId);
      return {
        id: c.id,
        otherUserId,
        lastMessage: c.last_message_text || "",
        lastMessageAt: c.last_message_at,
      };
    });

    const uniqueIds = [...new Set(otherIds)];

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", uniqueIds);

    if (usersError) {
      console.error("Error obteniendo usuarios:", usersError);
      return res.json(convWithOther);
    }

    const userMap = new Map();
    users.forEach((u) => {
      userMap.set(u.id, u.name || u.email);
    });

    const result = convWithOther.map((c) => ({
      ...c,
      otherUserName: userMap.get(c.otherUserId) || `Usuario ${c.otherUserId}`,
    }));

    return res.json(result);
  } catch (err) {
    console.error("Error en /conversations:", err);
    return res
      .status(500)
      .json({ error: "Error interno listando conversaciones" });
  }
});

/**
 * GET /api/chat/messages/:conversationId
 */
router.get("/messages/:conversationId", async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const { data: msgs, error: msgError } = await supabase
      .from(MESSAGES_TABLE)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("Error obteniendo mensajes:", msgError);
      return res.status(500).json({ error: "Error obteniendo mensajes" });
    }

    return res.json(msgs || []);
  } catch (err) {
    console.error("Error en /messages/:conversationId:", err);
    return res
      .status(500)
      .json({ error: "Error interno obteniendo mensajes" });
  }
});

/**
 * POST /api/chat/messages
 * body: { conversationId, from, to, text }
 */
router.post("/messages", async (req, res) => {
  try {
    const { conversationId, from, to, text } = req.body || {};

    if (!conversationId || !from || !to || !text) {
      return res.status(400).json({ error: "Faltan campos para mensaje" });
    }

    const createdAt = new Date().toISOString();

    const { data: insertedRows, error: insertError } = await supabase
      .from(MESSAGES_TABLE)
      .insert([
        {
          conversation_id: conversationId,
          from_user_id: from,
          to_user_id: to,
          text,
          created_at: createdAt,
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error insertando mensaje:", insertError);
      return res.status(500).json({ error: "Error guardando mensaje" });
    }

    const inserted = insertedRows[0];

    // actualizar último mensaje en la conversación
    const { error: updateError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .update({
        last_message_text: text,
        last_message_at: createdAt,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error actualizando conversación:", updateError);
    }

    return res.json(inserted);
  } catch (err) {
    console.error("Error en POST /messages:", err);
    return res.status(500).json({ error: "Error interno guardando mensaje" });
  }
});

export default router;
