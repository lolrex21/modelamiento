import React from "react";
import ChatBox from "./ChatBox";

const ChatModal = ({ isOpen, onClose, currentUserId, otherUserId, otherUserName }) => {
    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2000,
            }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "95%",
                    maxWidth: "450px",
                    background: "#252835",
                    padding: "20px",
                    borderRadius: "10px",
                    maxHeight: "90vh",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontSize: "1.4rem",
                        background: "none",
                        border: "none",
                        color: "white",
                        cursor: "pointer"
                    }}
                >
                    &times;
                </button>

                <h3 style={{ marginTop: 0 }}>Chat con {otherUserName}</h3>

                <ChatBox
                    userId={currentUserId}
                    otherUserId={otherUserId}
                    otherUserName={otherUserName}
                />
            </div>
        </div>
    );
};

export default ChatModal;
