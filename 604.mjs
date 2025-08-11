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
let firstStart = true
const socket = new WebSocket('ws://109.172.46.120:8080/ws'); 

socket.on('open', () => {
  console.log('✅ Подключено к серверу WebSocket');
  
  // Отправляем сообщение на сервер
  setTimeout(() => socket.send(JSON.stringify({action: "info"})), 2000)

});

// Событие при получении сообщения от сервера
socket.on('message', (data) => {
    const prices = JSON.parse(data);
    items = items.map(item => {
     return {
    ...item,
    priceSell: prices[item.id] || 0 // Если цены нет, ставим 0
    };
    });
    if (firstStart) {
        firstStart = false
        return
    }
    workers.forEach(w => w.postMessage({
    type: 'price',
    data: items
  }))
});

// Событие при закрытии соединения
socket.on('close', () => {
});

// Событие при ошибке
socket.on('error', (err) => {
  console.error('⚠️ Ошибка WebSocket:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7443919586:AAFR57rTaD7rvqA6I8D9Z9LCal2cb3WSsnI';

const tgBot = new TelegramBot(token, { polling: true });

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
while (!items.every(i => i.priceSell)) {
    await delay(500)
}

const infoChatID = -4709535234
const alertChatID = -4763690917
const pomoikaChatID = -4896488855

// Массив с ботами
const bots = [
    { username: 'alexeyer_doter', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3000, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'netherite sword', itemPrices:items, },
    { username: 'puanyi_doter', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3001, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'netherite sword', itemPrices:items, },
    { username: 'beawl__ahmat', password: 'ggggg', anarchy: 604, type: '4narek', inventoryPort: 3002, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false, item: 'netherite sword', itemPrices:items, }
];

// Массив для хранения ссылок на воркеров
// Массив для хранения ссылок на воркеров
let workers = [];

function runWorker(bot) {
    workers = workers.filter(w => w.workerData?.username !== bot.username);
    return new Promise((resolve, reject) => {
        const workerScriptPath = join(__dirname, `${bot.type}.mjs`);

        const worker = new Worker(workerScriptPath, {
            workerData: bot,
            resourceLimits: {
                maxOldGenerationSizeMb: 200, // Лимит памяти
            }
        });

        bot.isManualStop = false;

        workers.push(worker);
        setTimeout(() => {
            if (!bot.success) {
                worker.terminate();
            }
        }, 30000)
            setTimeout(() => {
            worker.terminate();

        }, 1200000)
        worker.on('message', async (message) => {
            if (message.name === 'success') {
                const botToUpdate = bots.find(bot => bot.username === message.username);
                if (botToUpdate) {
                    botToUpdate.success = true;
                }
            } else if (message.name === "buy") {
                socket.send(JSON.stringify({action: 'buy', type: message.id}));
            } else if (message.name === "sell") {
                socket.send(JSON.stringify({action: 'sell', type: message.id}));
            } else {
                tgBot.sendMessage(alertChatID, message);
            }
        });

        worker.on('error', (error) => {
            bot.success = false
            console.error(`Worker error: ${error}`);
            tgBot.sendMessage(alertChatID, `${bot.username} вырубился`);
            if (!bot.isManualStop) {
                runWorker(bot);
            }
        });

        worker.on('exit', (code) => {
            bot.success = false
            tgBot.sendMessage(alertChatID, `${bot.username} вырубился`);
            if (!bot.isManualStop) {
                runWorker(bot);
            }
        });
    });
}

function stopWorkers() {
    bots.forEach(bot => {
        bot.isManualStop = true
    })
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
            if (err) {
                reject(`Error executing git pull: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function restartBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {

        setTimeout(() => socket.send(JSON.stringify({action: "info"})), 3000)    
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

async function startBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        setTimeout(() => socket.send(JSON.stringify({action: "info"})), 1000)
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

tgBot.onText(/\/update/, async (msg) => {
    const now = new Date().getTime() / 1000; // Время в секундах

    // Проверяем, сколько времени прошло с момента отправки сообщения
    const messageTime = msg.date;
    if (now - messageTime > 10) {
        return; // Если прошло больше 10 секунд, прекращаем выполнение
    }
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
    const now = new Date().getTime() / 1000; // Время в секундах

    // Проверяем, сколько времени прошло с момента отправки сообщения
    const messageTime = msg.date;
    if (now - messageTime > 10) {
        return; // Если прошло больше 10 секунд, прекращаем выполнение
    }
    try {
        tgBot.sendMessage(alertChatID, 'Перезапуск ботов');
        await restartBots();
    } catch (error) {
        tgBot.sendMessage(alertChatID, `Произошла ошибка: ${error.message}`);
    }
});

tgBot.onText(/\/stop/, async (msg) => {
    const now = new Date().getTime() / 1000; // Время в секундах

    // Проверяем, сколько времени прошло с момента отправки сообщения
    const messageTime = msg.date;
    if (now - messageTime > 10) {
        return; // Если прошло больше 10 секунд, прекращаем выполнение
    }

    try {
        tgBot.sendMessage(alertChatID, 'Остановка ботов');
        await stopWorkers();
    } catch (error) {
        tgBot.sendMessage(alertChatID, `Произошла ошибка: ${error.message}`);
    }
});

startBots();