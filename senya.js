import { Worker } from 'worker_threads';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process'; // Для выполнения команд в терминале

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7962335030:AAEUDaIgCO0po9GFDlFBmwveBmTwX1Gh_sw';

const tgBot = new TelegramBot(token, { polling: true });

const infoChatID = -4709535234
const alertChatID = -4763690917

// Массив с ботами
const bots = [
    { username: 'antonaetogoebal', password: 'ggggg', anarchy: 603, type: 'sword7-nomend', inventoryPort: 3000, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false },
    { username: 'vot_dosada', password: 'ggggg', anarchy: 603, type: 'sword6', inventoryPort: 3001, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false },
    { username: 'king____shiz', password: 'ggggg', anarchy: 603, type: 'megasword', inventoryPort: 3002, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false }
];

// Массив для хранения ссылок на воркеров
// Массив для хранения ссылок на воркеров
let workers = [];

function runWorker(bot) {
    return new Promise((resolve, reject) => {
        const workerScriptPath = join(__dirname, `${bot.type}.js`);

        const worker = new Worker(workerScriptPath, {
            workerData: bot
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
            if (message.name === 'balance') {
                const currentBot = bots.find(bot => bot.username === message.username);
                if (!currentBot) return;
        
                // Обновляем статистику бота
                await updateBotStats(message.username, message.balance, message?.count);
        
                // Находим обновленного пользователя в массиве data
                const updatedUser = await getUserData(message.username);
        
                let msg = `\n${message.username}: ${Math.floor(updatedUser?.balance / 1000000)}кк, ${updatedUser?.count}шт`;
        
                const now = new Date();
                const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        
                if (!currentBot.msgTime || currentBot.msgTime < twoDaysAgo) {
                    tgBot.sendMessage(infoChatID, msg).then(sentMessage => {
                        if (currentBot.msgID) {
                            tgBot.deleteMessage(infoChatID, currentBot.msgID).catch(err => console.error('Ошибка удаления старого сообщения:', err));
                        }
                        currentBot.msgID = sentMessage.message_id;
                        currentBot.msgTime = new Date(); // Обновляем время
                    });
                } else {
                    tgBot.editMessageText(msg, {
                        chat_id: infoChatID,
                        message_id: currentBot.msgID
                    }).catch(err => {
                        console.error('Ошибка редактирования сообщения:', err.message);
                    });
                }
            } else if (message.name === 'success') {
                const botToUpdate = bots.find(bot => bot.username === message.username);
                if (botToUpdate) {
                    botToUpdate.success = true;
                }
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
        exec('rm data.json', (err, stdout, stderr) => {
            if (err) {
                reject(`Error executing rm data.json: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
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