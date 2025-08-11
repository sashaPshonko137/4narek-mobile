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
    workers.forEach(w => w.postMessage({
    type: 'price',
    data: items
  }))
});

// Событие при закрытии соединения
socket.on('close', () => {
  console.log('❌ Соединение закрыто');
});

// Событие при ошибке
socket.on('error', (err) => {
  console.error('⚠️ Ошибка WebSocket:', err);
});

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
                tgBot.sendMessage(pomoikaChatID, message.text);
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
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

async function startBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
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

const dataPath = join(__dirname, 'data.json');

async function updateBotStats(username, incomingBalance, incomingCount) {
    const MSK_OFFSET = -3;
    const nowUTC = new Date();
    const nowMSK = new Date(nowUTC.getTime() + MSK_OFFSET * 60 * 60 * 1000);
    const currentDateStr = nowMSK.toISOString().split('T')[0];
    const currentHour = nowMSK.getHours();

    let data = [];

    try {
        if (existsSync(dataPath)) {
            const content = await readFile(dataPath, 'utf8');
            data = JSON.parse(content || '[]');
        }
    } catch (error) {
        console.error('Ошибка при чтении или парсинге data.json:', error.message);
        data = [];
    }

    let user = data.find(u => u.username === username);

    // Логируем текущие данные
    console.log(`currentDateStr: ${currentDateStr}, user.time: ${user ? user.time : 'none'}`);

    // Измененная логика сброса
    const shouldReset = currentHour >= 20 || (user && user.time !== currentDateStr);

    if (!user) {
        // Если пользователь не найден, создаем его с текущими данными
        user = {
            username,
            balance: incomingBalance, // Устанавливаем начальный баланс
            count: incomingCount,     // Устанавливаем количество
            time: currentDateStr      // Устанавливаем актуальное время
        };
        data.push(user);
    } else {
        if (shouldReset) {
            // Если нужно сбросить данные, обновляем только баланс и дату
            user.balance = incomingBalance;  // Сбрасываем баланс на новое значение
            user.count = incomingCount;      // Перезаписываем количество
            user.time = currentDateStr;      // Обновляем дату
        } else {
            // Если сброс не нужен, добавляем баланс, а количество перезаписываем
            user.balance += incomingBalance;  // Добавляем новый баланс к старому
            user.count = incomingCount;       // Перезаписываем количество
        }
    }

    try {
        await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Ошибка при записи data.json:', error.message);
    }
}

async function getUserData(username) {
    let data = [];

    try {
        if (existsSync(dataPath)) {
            const content = await readFile(dataPath, 'utf8');
            data = JSON.parse(content || '[]');
        }
    } catch (error) {
        console.error('Ошибка при чтении или парсинге data.json:', error.message);
        data = [];
    }

    return data.find(u => u.username === username);
}