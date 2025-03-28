import { Worker } from 'worker_threads';
import { join, dirname } from 'path'; // Импортируем join и dirname для работы с путями
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';

// Получаем __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = '7593493670:AAEobzNu91yulqlgUbqLKBdPXzToRtv5VKQ';

const tgBot = new TelegramBot(token, { polling: true });

// Массив с ботами
const bots = [
    { username: 'varuha_pp', password: 'ggggg', anarchy: 605, type: 'unbreak', inventoryPort: 3000 },
    { username: 'trusi_bmw', password: 'ggggg', anarchy: 605, type: 'sword7-nomend', inventoryPort: 3001 },
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

        worker.on('message', (message) => {
            console.log(message);
            tgBot.sendMessage(-4763690917, message);
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