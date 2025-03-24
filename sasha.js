import { Worker } from 'worker_threads';
import { join, dirname } from 'path'; // Импортируем join и dirname для работы с путями
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';

// Получаем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7446293384:AAHdrkMzwWlvyYcaohQL7zc_Q-MLQw_F1eo';

const tgBot = new TelegramBot(token, { polling: true });

// Массив с ботами
const bots = [
    { username: 'hanter_bayden', password: 'ggggg', anarchy: 602, type: 'sword7', inventoryPort: 3000, balance: undefined },
    { username: 'borsh_banan', password: 'ggggg', anarchy: 602, type: 'sword-nomend', inventoryPort: 3001, balance: undefined },
    { username: '88hueta', password: 'ggggg', anarchy: 602, type: 'sword', inventoryPort: 3002, balance: undefined  },
];

// Функция для запуска Worker'ов
function runWorker(bot) {
    return new Promise((resolve, reject) => {
        // Строим путь к скрипту для конкретного типа бота
        const workerScriptPath = join(__dirname, `${bot.type}.js`);

        // Запускаем worker с переданным типом и данными бота
        const worker = new Worker(workerScriptPath, {
            workerData: bot // Передаем данные бота в worker
        });

        let msgBalance = undefined
        let mu = false
        const taskQueue = [];

        async function processTaskQueue() {
            if (taskQueue.length === 0 || mu) return;
            mu = true;
        
            const task = taskQueue.shift();
            try {
                const currentBot = bots.find(bot => bot.username === task.username);
                if (currentBot) {
                    currentBot.balance = task.balance;
                    let msg = 'Баланс';
                    for (const bot of bots) {
                        msg += `\n${bot.username}: ${bot.balance}$`;
                    }
        
                    if (!msgBalance) {
                        const sentMessage = await tgBot.sendMessage(-4763690917, msg);
                        msgBalance = sentMessage.message_id;
                    } else {
                        await tgBot.editMessageText(msg, {
                            chat_id: -4763690917,
                            message_id: msgBalance
                        });
                    }
                }
            } catch (error) {
                console.error('Ошибка при обработке задачи:', error);
            } finally {
                mu = false;
                processTaskQueue(); // Обработать следующую задачу в очереди
            }
        }
        
        worker.on('message', (message) => {
            if (message.name === 'balance') {
                // Добавляем задачу в очередь
                taskQueue.push(message);
                if (!mu) {
                    processTaskQueue();
                }
            } else {
                tgBot.sendMessage(-4763690917, message);
            }
        });

        worker.on('error', (error) => {
            console.error(`Worker error: ${error}`);
            reject(error);
        });

        worker.on('exit', (code) => {
            tgBot.sendMessage(-4763690917, `@sasha_pshonko\n${bot.username} вырубился`);
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            } else {
                resolve(`${bot.type} bot finished successfully`);
            }
        });
    });
}

// Запускаем все Workers параллельно
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