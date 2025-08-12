import { WebSocket } from "ws";

 const socket = new WebSocket('ws://109.172.46.120:8080/ws');

  socket.on('open', () => {
    console.log('✅ Подключено к серверу WebSocket');
    setTimeout(() =>    socket.send(JSON.stringify({ action: "info" })), 5000
    )

  });

  socket.on('message', (data) => {
    try {
      const prices = JSON.parse(data);
      console.log(prices)
    } catch (e) {
      console.error('Ошибка обработки сообщения от сервера:', e.message);
    }
  });