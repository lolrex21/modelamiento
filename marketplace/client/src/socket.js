
import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Apunta a tu backend
export const socket = io(API_URL, {
  withCredentials: true,
  autoConnect: true, // nos conectamos manualmente
});
