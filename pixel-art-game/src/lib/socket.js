// src/lib/socket.js
import { io } from 'socket.io-client';

// Определение URL бэкенда в зависимости от окружения
const BACKEND_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_BACKEND_URL || 'https://your-backend-url.railway.app'
  : 'http://localhost:5000';

// Создание и экспорт экземпляра сокета
export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Вспомогательные функции для работы с сокетом
export const socketService = {
  // Подключение к серверу
  connect: () => {
    return new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        resolve(true);
      });
    });
  },
  
  // Отключение от сервера
  disconnect: () => {
    socket.disconnect();
  },
  
  // Отправка события
  emit: (event, data) => {
    socket.emit(event, data);
  },
  
  // Подписка на событие
  on: (event, callback) => {
    socket.on(event, callback);
  },
  
  // Отписка от события
  off: (event, callback) => {
    socket.off(event, callback);
  },
  
  // Получение ID сессии
  getSessionId: () => {
    return socket.id;
  },
  
  // Проверка состояния подключения
  isConnected: () => {
    return socket.connected;
  }
};

export default socketService;

