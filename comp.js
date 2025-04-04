import { Worker } from 'worker_threads';
import { join, dirname } from 'path'; // Импортируем join и dirname для работы с путями
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';
import { exec } from 'child_process'; // Для выполнения команд в терминале

// Получаем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7593493670:AAEobzNu91yulqlgUbqLKBdPXzToRtv5VKQ';

const infoChatID = -4709535234
const alertChatID = -4763690917

const tgBot = new TelegramBot(token, { polling: true });

// Массив с ботами
const bots = [
    { username: 'shaltai_glotai', password: 'ggggg', anarchy: 605, type: 'unbreak', inventoryPort: 3000, msgID: 0, msgTime: null, isRunning: false, isManualStop: false  },
    { username: 'trusishki_bmw', password: 'ggggg', anarchy: 605, type: 'sword7-nomend', inventoryPort: 3001, msgID: 0, msgTime: null, isRunning: false, isManualStop: false  },
];

let workers = [];

function runWorker(bot) {
    return new Promise((resolve, reject) => {
        const workerScriptPath = join(__dirname, `${bot.type}.js`);
        const worker = new Worker(workerScriptPath, { workerData: bot });

        bot.isRunning = true;
        bot.isManualStop = false;

        workers.push(worker);

        worker.on('message', (message) => {
            if (message.name === 'balance') {
                const currentBot = bots.find(bot => bot.username === message.username);
                currentBot.balance = message.balance;
                let msg = `\n${message.username}: ${Math.floor(message.balance / 1000000)}кк, ${message.count}шт`;
                
                const now = new Date();
                const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
                
                if (!currentBot.msgTime || currentBot.msgTime < twoDaysAgo) {
                    tgBot.sendMessage(infoChatID, msg).then(message => {
                        if (currentBot.msgID) {
                            tgBot.deleteMessage(infoChatID, currentBot.msgID).catch(err => console.error('Error deleting message:', err));
                        }
                        currentBot.msgID = message.message_id;
                        currentBot.msgTime = new Date();
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
            console.error(`Worker error for ${bot.username}: ${error}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            console.log(`Worker for ${bot.username} exited with code ${code}`);
            tgBot.sendMessage(alertChatID, `@sasha_pshonko\n${bot.username} вырубился`);
            bot.isRunning = false;

            if (code !== 0 && !bot.isManualStop) {
                console.log("Restarting worker...");
                // runWorker(bot); // Перезапуск воркера
            }

            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve(`${bot.type} bot finished successfully`);
            }
        });
    });
}


// Функция для остановки всех воркеров
function stopWorkers() {
    return new Promise((resolve, reject) => {
        console.log("Stopping workers...");
        try {
            workers.forEach(worker => {
                console.log(`Terminating worker: ${worker.threadId}`);
                worker.terminate();
            });
            workers = []; // Очищаем массив воркеров
            console.log('All workers stopped');
            resolve('All workers stopped');
        } catch (error) {
            console.error('Error stopping workers:', error);
            reject('Error stopping workers: ' + error);
        }
    });
}

// Функция для выполнения git pull
function gitPull() {
    return new Promise((resolve, reject) => {
        console.log("Running git pull...");
        exec('git pull', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing git pull: ${stderr}`);
                reject(`Error executing git pull: ${stderr}`);
            } else {
                console.log(`Git pull result: ${stdout}`);
                resolve(stdout);
            }
        });
    });
}

// Перезапуск ботов с логированием
async function restartBots() {
    console.log("Restarting bots...");

    // Ожидаем завершения всех текущих ботов, если они работают
    await stopWorkers();

    // Запускаем новых ботов
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
        throw new Error('Error restarting bots');
    }
}


// Основная логика для обработки команды /update
tgBot.onText(/\/update/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        console.log("Stopping workers for update...");
        await stopWorkers(); // Останавливаем всех воркеров
        
        console.log("Executing git pull...");
        const pullResult = await gitPull(); // Выполняем git pull
        tgBot.sendMessage(alertChatID, `Git pull выполнен`);

        console.log("Restarting bots...");
        await restartBots(); // Перезапускаем всех ботов
        tgBot.sendMessage(alertChatID, "Все боты перезапущены!");
    } catch (error) {
        console.error('Error during /update:', error.message);
        tgBot.sendMessage(alertChatID, `Произошла ошибка при обновлении: ${error.message}`);
    }
});

async function startBots() {
    const botPromises = bots.map((bot) => runWorker(bot));

    try {
        const results = await Promise.all(botPromises);
        console.log('All bots finished:', results);
    } catch (error) {
        console.error('Error in bot execution:', error);
    }
}

startBots();
