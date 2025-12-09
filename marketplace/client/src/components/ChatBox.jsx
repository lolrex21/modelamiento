
import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const ChatBox = ({ userId, otherUserId, onClose }) => {
  console.log("Render ChatBox", { userId, otherUserId });
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  const formatLocalTime = (created_at) => {
    if (!created_at) return "";
    const iso = created_at.replace(" ", "T") + "Z";

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };



  // 1) Inicializar: conectar socket, unirse al room y obtener/crear conversación
  useEffect(() => {
    if (!userId || !otherUserId) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    console.log('usuario real', userId)
    const initChat = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        // Asegurarse de que el socket esté conectado
        if (!socket.connected) {
          socket.connect();
        }

        // Unirse al room (solo para realtime)
        socket.emit("join_room", { userId, otherUserId });

        // Crear o recuperar conversación en Supabase
        const resp = await fetch(`${API_URL}/api/chat/conversation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, otherUserId }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error("Error creando/obteniendo conversación:", txt);
          setErrorMsg("No se pudo iniciar la conversación.");
          setLoading(false);
          return;
        }

        const data = await resp.json();
        // Esperamos que el back responda { conversationId, ... }
        setConversationId(data.conversationId);
      } catch (err) {
        console.error("Error en initChat:", err);
        setErrorMsg("Error al iniciar el chat.");
        setLoading(false);
      }
    };

    initChat();
  }, [userId, otherUserId]);


  useEffect(() => {
    if (!conversationId) return;

    let aborted = false;

    const fetchMessages = async () => {
      try {
        const resp = await fetch(
          `${API_URL}/api/chat/messages/${conversationId}`
        );

        if (!resp.ok) {
          const txt = await resp.text();
          console.error("Error obteniendo mensajes:", txt);
          if (!aborted) setErrorMsg("No se pudieron cargar los mensajes.");
          if (!aborted) setLoading(false);
          return;
        }

        const data = await resp.json();
        if (!aborted) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const merged = [...prev];

            (data || []).forEach((m) => {
              if (!existingIds.has(m.id)) merged.push(m);
            });

            return merged;
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Error obteniendo mensajes:", err);
        if (!aborted) {
          setErrorMsg("Error al cargar los mensajes.");
          setLoading(false);
        }
      }
    };

    fetchMessages();

    // Listener de mensajes en tiempo real
    const handleReceive = (msg) => {
      if (msg.conversation_id !== conversationId) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
    };

    socket.on("receive_message", handleReceive);

    return () => {
      aborted = true;
      socket.off("receive_message", handleReceive);
    };
  }, [conversationId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;

    const payload = {
      conversationId,
      from: userId,
      to: otherUserId,
      text: text.trim(),
    };

    socket.emit("send_message", payload);
    setText("");
  };

  useEffect(() => {
    // al cargar por primera vez o cuando se agregan mensajes nuevos
    scrollToBottom("smooth"); // o "smooth" si quieres animación también al cargar
  }, [messages]);
  return (
    <div className="chatbox">
      <div className="chatbox__header">
        <span>Chat</span>
        {onClose && (
          <button className="chatbox__close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="chatbox__messages">
        {loading && (
          <div className="chatbox__empty">Cargando conversación...</div>
        )}

        {!loading && errorMsg && (
          <div className="chatbox__empty" style={{ color: "#f87171" }}>
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && messages.length === 0 && (
          <div className="chatbox__empty">Empieza la conversación ✨</div>
        )}

        {!loading &&
          !errorMsg &&
          messages.map((msg) => {
            const mine = String(msg.from_user_id) === String(userId);
            return (
              <div
                key={msg.id}
                className={`chatbox__message ${mine ? "chatbox__message--mine" : "chatbox__message--other"
                  }`}
              >
                <div className="chatbox__bubble">{msg.text}</div>
                <div className="chatbox__time">
                  {formatLocalTime(msg.created_at)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
      </div>

      <form className="chatbox__input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}

          disabled={loading || !!errorMsg || !conversationId}
        />
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={loading || !!errorMsg || !conversationId || !text.trim()}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
