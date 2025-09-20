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

const token = '7443919586:AAFR57rTaD7rvqA6I8D9Z9LCal2cb3WSsnI';

const tgBot = new TelegramBot(token, { polling: true });



const infoChatID = -4709535234
const alertChatID = -4763690917
const pomoikaChatID = -4896488855

// Массив с ботами
const bots = [
    { username: 'buryi_bura', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3000, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'elytra', itemPrices:items, },
    { username: 'karabul_susu', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3001, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'elytra', itemPrices:items, },
    { username: 'KAK_GNOST1K', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3002, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'elytra', itemPrices:items, }
];

let workers = [];
let botItems = new Map
let botInventory = new Map

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
      } else if (message.name === "items") {
        botItems.set(message.username, message.items)
      } else if (message.name === "try-sell") {
        socket?.send(JSON.stringify({ action: "try-sell", type: message.id }));
      } else if (message.name === "inventory") {
        botInventory.set(message.username, message.data)
      } else if (message.name === "buying") {
        socket?.send(JSON.stringify({ action: "add", json_data: message.data }));
      }  else {
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
    const dataObj = JSON.parse(data);
    
    // Проверяем тип сообщения по наличию action
    if (dataObj.action === "json_update" && Array.isArray(dataObj.data)) {
      // Обрабатываем JSON-обновления
      workers.forEach(w => w.postMessage({ 
        type: 'items_buying', 
        data: dataObj.data 
      }));
    } 
    // Обрабатываем обновление цен
    else if (dataObj.prices) {
      items = items.map(item => ({
        ...item,
        priceSell: dataObj.prices[item.id],
        ratio: dataObj.ratios[item.id]
      }));
      bots.forEach(bot => bot.itemPrices = items);

      console.log('📦 Обновлены цены:', items.map(i => `${i.id}: ${i.priceSell}`));

      workers.forEach(w => w.postMessage({ type: 'price', data: items }));

      // Если первый раз получили цены — запускаем ботов
      if (!botsStarted && items.every(i => i.priceSell)) {
        botsStarted = true;
        startBots();
      }
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

setInterval(() => {
  if (isSocketOpen) {
    const itemsCount = new Map
    const itemsCountInventory = new Map
    for (let items of Array.from(botItems.values())) {
      for (let item of items) {
        const count = itemsCount.get(item)
        if (count) {itemsCount.set(item, count+1)} else itemsCount.set(item, 1)
      }
    }  
    for (let items of Array.from(botInventory.values())) {
      for (let item of items) {
        const count = itemsCountInventory.get(item)
        if (count) {itemsCountInventory.set(item, count+1)} else itemsCountInventory.set(item, 1)
      }
    }
    const ah = Object.fromEntries(itemsCount)
    const inv = Object.fromEntries(itemsCountInventory)
    socket.send(JSON.stringify({ action: "presence", items:ah, inventory: inv}));
  }
}, 30000);

let botsStarted = false;
connectWebSocket();
