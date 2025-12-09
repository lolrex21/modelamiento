
import { io } from "socket.io-client";

// Apunta a tu backend
export const socket = io("http://localhost:4000", {
  withCredentials: true,
  autoConnect: true, // nos conectamos manualmente
});
