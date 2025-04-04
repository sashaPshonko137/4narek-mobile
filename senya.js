import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7962335030:AAEUDaIgCO0po9GFDlFBmwveBmTwX1Gh_sw';

const tgBot = new TelegramBot(token, { polling: true });

const infoChatID = -4709535234
const alertChatID = -4763690917

// Массив с ботами
const bots = [
    { username: 'golovogolovyi', password: 'ggggg', anarchy: 603, type: 'helmet', inventoryPort: 3000, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false },
    { username: 'babatoma5_0', password: 'ggggg', anarchy: 603, type: 'chestplate', inventoryPort: 3001, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false },
    { username: 'don_pteranodon', password: 'ggggg', anarchy: 603, type: 'leggins', inventoryPort: 3002, balance: 0, msgID: 0, msgTime: null, isRunning: false, isManualStop: false }
];

let workers = [];

function runWorker(bot) {
    return new Promise((resolve, reject) => {
        const workerScriptPath = join(__dirname, `${bot.type}.js`);

        const worker = new Worker(workerScriptPath, {
            workerData: bot
        });

        bot.isRunning = true;
        bot.isManualStop = false;

        workers.push(worker);

        worker.on('message', (message) => {
            if (message.name === 'balance') {
                const currentBot = bots.find(bot => bot.username === message.username);
                currentBot.balance = message.balance;
                let msg = 'Баланс';
                msg += `\n${message.username}: ${Math.floor(message.balance / 1000000)}кк`;
                
                // Проверяем, прошло ли больше 2-х дней с момента последнего сообщения
                const now = new Date();
                const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
                
                if (!currentBot.msgTime || currentBot.msgTime < twoDaysAgo) {
                    tgBot.sendMessage(infoChatID, msg).then(message => {
                        if (currentBot.msgID) {
                            tgBot.deleteMessage(infoChatID, currentBot.msgID).catch(err => console.error('Error deleting message:', err));
                        }
                        currentBot.msgID = message.message_id;
                        currentBot.msgTime = new Date(); // Обновляем время отправки
                    });
                } else {
                    tgBot.editMessageText(msg, {
                        chat_id: infoChatID,
                        message_id: currentBot.msgID
                    });
                }
                return;
            }
            tgBot.sendMessage(alertChatID, message);
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            tgBot.sendMessage(alertChatID, `@sasha_pshonko\n${bot.username} вырубился`);
            bot.isRunning = false;
            if (code !== 0 && !bot.isManualStop) {
                runWorker(bot);
            }
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve(`${bot.type} bot finished successfully`);
            }
        });
    });
}

function stopWorkers() {
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
    try {
        tgBot.sendMessage(alertChatID, 'Перезапуск ботов');
        await restartBots();
    } catch (error) {
        tgBot.sendMessage(alertChatID, `Произошла ошибка: ${error.message}`);
    }
});

tgBot.onText(/\/stop/, async (msg) => {
    try {
        tgBot.sendMessage(alertChatID, 'Остановка ботов');
        await stopWorkers();
        bots.forEach(bot => bot.isManualStop = true);

    } catch (error) {
        tgBot.sendMessage(alertChatID, `Произошла ошибка: ${error.message}`);
    }
});

startBots();
