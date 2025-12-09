// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./auth.routes.js";
import productRoutes from './product.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import conversationRoutes from "./conversation.routes.js";

// 👉 importa supabase
import { supabase } from "./db.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api/chat", conversationRoutes);
app.use('/api', productRoutes);
app.use('/api', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.get("/", (_req, res) => res.send("API OK"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// función helper para generar un room único para 2 usuarios
const getRoomId = (userA, userB) => {
  const ids = [String(userA), String(userB)].sort();
  return `chat_${ids[0]}_${ids[1]}`;
};

// helper para obtener o crear conversación en Supabase
async function getOrCreateConversation(userA, userB) {
  const [ua, ub] = [Number(userA), Number(userB)].sort((a, b) => a - b);

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("user1_id", ua)
    .eq("user2_id", ub)
    .maybeSingle();

  if (findError) {
    console.error("[CHAT-SOCKET] Error buscando conversación:", findError);
    throw findError;
  }

  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .insert([
      {
        user1_id: ua,
        user2_id: ub,
      },
    ])
    .select("*")
    .single();

  if (insertError) {
    console.error("[CHAT-SOCKET] Error creando conversación:", insertError);
    throw insertError;
  }

  return inserted;
}

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  socket.on("join_room", async ({ userId, otherUserId }) => {
    try {
      // nos aseguramos de que exista la conversación
      const convo = await getOrCreateConversation(userId, otherUserId);

      const roomId = getRoomId(userId, otherUserId);
      socket.join(roomId);

      console.log(
        `👥 Usuario ${userId} se unió al room ${roomId} (conversation_id=${convo.id})`
      );
    } catch (err) {
      console.error("[CHAT-SOCKET] Error en join_room:", err);
    }
  });

  socket.on("send_message", async ({ from, to, text }) => {
    try {
      if (!from || !to || !text?.trim()) return;

      const convo = await getOrCreateConversation(from, to);
      const roomId = getRoomId(from, to);

      // 1) guardar mensaje en Supabase
      const { data: inserted, error: insertError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: convo.id,
            from_user_id: from,
            to_user_id: to,
            text: text.trim(),
          },
        ])
        .select("id, conversation_id, from_user_id, to_user_id, text, created_at")
        .single();

      if (insertError) {
        console.error("[CHAT-SOCKET] Error guardando mensaje:", insertError);
        return;
      }

      // 2) actualizar resumen de conversación
      await supabase
        .from("conversations")
        .update({
          last_message_text: inserted.text,
          last_message_at: inserted.created_at
        })
        .eq("id", convo.id);

      // 3) armar payload igual que en REST
      const payload = {
        id: inserted.id,
        conversation_id: inserted.conversation_id,
        from_user_id: inserted.from_user_id,
        to_user_id: inserted.to_user_id,
        text: inserted.text,
        created_at: inserted.created_at,
      };

      io.to(roomId).emit("receive_message", payload);
    } catch (err) {
      console.error("[CHAT-SOCKET] Error en send_message:", err);
    }
  });

  socket.on("typing", ({ from, to }) => {
    const roomId = getRoomId(from, to);
    io.to(roomId).emit("typing", { from, to });
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 API + WebSocket escuchando en http://localhost:${PORT}`);
});
