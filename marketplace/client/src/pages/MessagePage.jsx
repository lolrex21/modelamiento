// src/pages/MessagesPage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ChatModal from "../components/ChatModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const MessagesPage = () => {
  const { user, isAuthenticated, loading } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [error, setError] = useState(null);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const fetchConversations = async () => {
      try {
        setLoadingConvs(true);
        setError(null);

        const token = localStorage.getItem("token");

        const res = await fetch(
          `${API_URL}/api/chat/conversations/${user.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error al cargar conversaciones");
        }

        const data = await res.json();

        const normalized = (data || []).map((c) => ({
          id: c.id,
          otherUserId: c.otherUserId,
          otherUserName: c.otherUserName,
          lastMessage: c.lastMessage || "",
          lastMessageAt: c.lastMessageAt || c.last_message_at || null,
        }));

        setConversations(normalized);
      } catch (err) {
        console.error("[MessagesPage] Error obteniendo conversaciones:", err);
        setError(err.message || "Error al cargar conversaciones");
      } finally {
        setLoadingConvs(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated, user?.id]);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <section className="section section--compact">
        <div className="container">
          <div className="card" style={{ padding: "20px" }}>
            <p>Debes iniciar sesión para ver tus mensajes.</p>
          </div>
        </div>
      </section>
    );
  }

  const handleOpenChat = (conv) => {
    setSelectedConversation(conv);
    setChatOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="section section--compact">
      <div className="container">
        <div className="card" style={{ padding: "20px 24px" }}>
          <h1 style={{ margin: 0, marginBottom: "6px" }}>Mensajes</h1>
          <p className="text-muted" style={{ marginTop: 0, marginBottom: "16px" }}>
            Selecciona una conversación para abrir el chat.
          </p>

          {loadingConvs ? (
            <p className="text-muted">Cargando conversaciones...</p>
          ) : error ? (
            <p style={{ color: "var(--danger)" }}>{error}</p>
          ) : conversations.length === 0 ? (
            <p className="text-muted">No tienes conversaciones aún.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        marginBottom: "2px",
                      }}
                    >
                      {conv.otherUserName || `Usuario #${conv.otherUserId}`}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                        maxWidth: "280px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.lastMessage || "Sin mensajes aún"}
                    </div>
                    {conv.lastMessageAt && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                          marginTop: "2px",
                        }}
                      >
                        {formatDate(conv.lastMessageAt)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenChat(conv)}
                    className="btn btn--primary btn--sm"
                  >
                    Abrir chat 💬
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {chatOpen && selectedConversation && (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          currentUserId={user.id}
          otherUserId={selectedConversation.otherUserId}
          otherUserName={selectedConversation.otherUserName}
        />
      )}
    </section>
  );
};

export default MessagesPage;
