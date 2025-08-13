import { Worker } from 'worker_threads';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import WebSocket from 'ws';
import { exec } from 'child_process'; // Для выполнения команд в терминале

const itemsJson = await readFile('items.json')
let items = JSON.parse(itemsJson)


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7706810780:AAF_sXYsrKJqeOuz7Wg8WSBuVrcGN52QM4I';

const tgBot = new TelegramBot(token, { polling: true });

const infoChatID = -4709535234
const alertChatID = -4763690917
//  username: 'ibra_KAMURAD', password: 'ggggg', anarchy: 508, type: 'elytra', inventoryPort: 3000, balance: undefined, msgID: 0, msgTime: null, isManualStop: false  },
//     { username: 'ashot_pashot', password: 'ggggg', anarchy: 508, type: 'elytra', inventoryPort: 3001, balance: undefined, msgID: 0, msgTime: null, isManualStop: false  },
//     { username: 'bosh__ivan', password: 'ggggg', anarchy: 508, type: 'elytra', inventoryPort: 3002, balance: undefined, msgID: 0, msgTime: null, isManualStop: false   },
// ];
// Массив с ботами
const bots = [
    { username: 'ultra__gay', password: 'ggggg', anarchy: 504, type: '4narek', inventoryPort: 3000, balance: 0, msgID: 0, item: 'netherite sword' },
    { username: 'hr_vladyka', password: 'ggggg', anarchy: 504, type: '4narek', inventoryPort: 3001, balance: 0, msgID: 0, item: 'netherite sword' },
    { username: 'ostap_paravoz', password: 'ggggg', anarchy: 504, type: '4narek', inventoryPort: 3002, balance: 0, msgID: 0, item: 'netherite sword' }
];
let workers = [];
let botItems = new Map

let socket;
let isSocketOpen = false;

function runWorker(bot) {
  // Если уже есть активный воркер для этого бота — не запускаем повторно
  if (workers.some(w => w.workerData?.username === bot.username)) {
    console.warn(`⏩ Воркер для ${bot.username} уже запущен. Пропуск.`);
    return;
  }

  return new Promise((resolve, reject) => {
    const workerScriptPath = join(__dirname, `${bot.type}.mjs`);
    const worker = new Worker(workerScriptPath, {
      workerData: bot,
      resourceLimits: {
        maxOldGenerationSizeMb: 200,
      }
    });

    bot.isManualStop = false;
    bot.lastRestartTime = Date.now();
    workers.push(worker);

    // Убить если неуспешный запуск за 30 сек
    setTimeout(() => {
      if (!bot.success) {
        console.warn(`⏱ ${bot.username} не ответил успехом за 30 секунд. Убиваем.`);
        worker.terminate();
      }
    }, 30000);

    // Ограничить время жизни воркера (1 час)
    setTimeout(() => {
      console.log(`⏲️ Воркер ${bot.username} отработал 1 час. Завершаем.`);
      worker.terminate();
    }, 3600000);

    worker.on('message', async (message) => {
      if (message.name === 'success') {
        const botToUpdate = bots.find(b => b.username === message.username);
        if (botToUpdate) {
          botToUpdate.success = true;
          console.log(`✅ ${message.username} успешно запущен`);
        }
      } else if (message.name === "buy") {
        socket?.send(JSON.stringify({ action: 'buy', type: message.id }));
      } else if (message.name === "sell") {
        socket?.send(JSON.stringify({ action: 'sell', type: message.id }));
      } else if (message.name === "count") {
        botItems.set(message.username, { count: message.count, type: message.type })
      } else {
        tgBot.sendMessage(alertChatID, message);
      }
    });

    const handleRestart = () => {
      // Удалить воркер из списка
      workers = workers.filter(w => w !== worker);

      if (!bot.isManualStop) {
        setTimeout(() => {
          console.log(`🔁 Перезапуск бота ${bot.username} через 20 секунд`);
          runWorker(bot);
        }, 20000);
      }
    };

    worker.on('error', (error) => {
      bot.success = false;
      console.error(`❌ Worker error (${bot.username}): ${error}`);
      tgBot.sendMessage(alertChatID, `${bot.username} вырубился с ошибкой`);
      handleRestart();
    });

    worker.on('exit', () => {
      bot.success = false;
      console.warn(`⚠️ Worker ${bot.username} завершился`);
      tgBot.sendMessage(alertChatID, `${bot.username} вырубился`);
      handleRestart();
    });
  });
}

function stopWorkers() {
  bots.forEach(bot => {
    bot.isManualStop = true;
  });
  return new Promise((resolve, reject) => {
    try {
      workers.forEach(worker => worker.terminate());
      workers = [];
      resolve('All workers stopped');
    } catch (error) {
      reject('Error stopping workers: ' + error);
    }
  });
}

function gitPull() {
  return new Promise((resolve, reject) => {
    exec('git pull', (err, stdout, stderr) => {
      if (err) reject(`Error executing git pull: ${stderr}`);
      else resolve(stdout);
    });
  });
}

async function startBots() {
  bots.forEach(bot => bot.itemPrices = items);
  const botPromises = bots.map(bot => runWorker(bot));
  try {
    setTimeout(() => socket?.send(JSON.stringify({ action: "info" })), 1000);
    const results = await Promise.all(botPromises);
    console.log('All bots finished:', results);
  } catch (error) {
    console.error('Error in bot execution:', error);
  }
}

async function restartBots() {
  bots.forEach(bot => bot.itemPrices = items);
  const botPromises = bots.map(bot => runWorker(bot));
  try {
    setTimeout(() => socket?.send(JSON.stringify({ action: "info" })), 3000);
    const results = await Promise.all(botPromises);
    console.log('All bots finished:', results);
  } catch (error) {
    console.error('Error in bot execution:', error);
  }
}

tgBot.onText(/\/update/, async (msg) => {
  if ((Date.now() / 1000) - msg.date > 10) return;
  try {
    await stopWorkers();
    const pullResult = await gitPull();
    tgBot.sendMessage(alertChatID, `Git pull выполнен:\n${pullResult}`);
    await restartBots();
  } catch (error) {
    tgBot.sendMessage(alertChatID, `Произошла ошибка: ${error.message}`);
  }
});

tgBot.onText(/\/start/, async (msg) => {
  if ((Date.now() / 1000) - msg.date > 10) return;
  tgBot.sendMessage(alertChatID, 'Перезапуск ботов');
  await restartBots();
});

tgBot.onText(/\/stop/, async (msg) => {
  if ((Date.now() / 1000) - msg.date > 10) return;
  tgBot.sendMessage(alertChatID, 'Остановка ботов');
  await stopWorkers();
});

function connectWebSocket() {
  socket = new WebSocket('ws://109.172.46.120:8080/ws');

  socket.on('open', () => {
    let intervalId;

    socket.onopen = () => {
      console.log('✅ Подключено к серверу WebSocket');
      socket.send(JSON.stringify({ action: "info" }));

      // Запускаем периодическую отправку
      intervalId = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          let count = 0
          let type = ""
          for (data of botItems.values) {
            count += data.count
            type = data.type
          }
          socket.send(JSON.stringify({ action: "presence", count: count, type: type }));
        }
      }, 30000); 
    };

    socket.onclose = () => {
      console.warn('❌ Соединение закрыто');
      if (intervalId) clearInterval(intervalId);
    };
    console.log('✅ Подключено к серверу WebSocket');
    isSocketOpen = true;
    socket.send(JSON.stringify({ action: "info" }));
  });

  socket.on('message', (data) => {
    try {
      const prices = JSON.parse(data);
      items = items.map(item => ({
        ...item,
        priceSell: prices[item.id] || 0
      }));
      bots.forEach(bot => bot.itemPrices = items);

      console.log('📦 Обновлены цены:', items.map(i => `${i.id}: ${i.priceSell}`));

      workers.forEach(w => w.postMessage({ type: 'price', data: items }));

      // Если первый раз получили цены — запускаем ботов
      if (!botsStarted && items.every(i => i.priceSell)) {
        botsStarted = true;
        startBots();
      }

    } catch (e) {
      console.error('Ошибка обработки сообщения от сервера:', e.message);
    }
  });

  socket.on('close', () => {
    console.log('❌ WebSocket отключён. Реконнект через 5 секунд...');
    isSocketOpen = false;
    setTimeout(connectWebSocket, 5000);
  });

  socket.on('error', (err) => {
    console.error('⚠️ Ошибка WebSocket:', err.message);
  });
}

let botsStarted = false;
connectWebSocket();
