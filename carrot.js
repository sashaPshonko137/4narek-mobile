const fs = require('fs').promises;
const mineflayer = require('mineflayer');
const inventoryViewer = require('mineflayer-web-inventory');
const { createLogger, transports, format } = require('winston');
const { workerData } = require('worker_threads');

const minDelay = 500;
const AHDelay = 2000;
const loadingDelay = 100;

const maxPrice = 200000
const priceSell = 250000

const minBalance = 5000000

const chooseBuying = 'Выбор скупки ресурсов';
const setSectionFarmer = 'Установка секции "фермер"';
const sectionFarmer = 'Секция "фермер"';
const setSectionFood = 'Установка секции "еда"';
const sectionFood = 'Секция "еда"';
const setSectionResources = 'Установка секции "ценные ресурсы"';
const sectionResources = 'Секция "ценные ресурсы"';
const setSectionLoot = 'Установка секции "добыча"';
const sectionLoot = 'Секция "добыча"';
const ah = 'Аукцион';
const setCategory = 'Установка категории';
const analysisAH = 'Анализ аукциона';
const buy = 'Покупка';
const setMyItems = 'Установка хранилища';
const myItems = 'Хранилище';
const setAH = 'Установка аукциона';

const slotToChooseBuying = 13;
const slotToSetSectionFarmer = 13;
const slotToLeaveSection = 3;
const slotToSetSectionFood = 21;
const slotToSetSectionResources = 23;
const slotToSetSectionLoot = 31;
const slotToTuneAH = 52;
const slotToReloadAH = 49;
const slotToTryBuying = 0;

const ahCommand = '/ah search golden carrot';

const leftMouseButton = 0;
const noShift = 0;
const firstInventorySlot = 9;
const lastInventorySlot = 44;
const firstAHSlot = 0;
const lastAHSlot = 44;
const firstSellSlot = 36;

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new transports.Console()
    ]
});

async function launchElytraBuyer(name, password, anarchy, inventoryPort) {
    const bot = mineflayer.createBot({
        host: 'mc.funtime.su',
        port: 25565,
        username: name,
        password: password,
        version: '1.16.5',
        // agent: new ProxyAgent({
        //     protocol: 'socks5',
        //     host: '77.221.150.135',
        //     port: 26462,
        //     username: 'hkhbR44IM3',
        //     password: '0KLVZbvlpz',
        // }),
        // connect: client => {
        //     socks.createConnection(
        //         {
        //             proxy: {
        //                 host: '77.221.150.135',
        //                 port: 26462,
        //                 type: 5,
        //                 userId: 'hkhbR44IM3',
        //                 password: '0KLVZbvlpz',
        //             },
        //             command: 'connect',
        //             destination: {
        //                 host: 'mc.funtime.su',
        //                 port: 25565,
        //             },
        //         },
        //         (err, info) => {
        //             if (err) {
        //                 console.log(err)
        //                 return
        //             }
        //             client.setSocket(info.socket)
        //             client.emit('connect')
        //         }
        //     )
        // },
    });

    inventoryViewer(bot, {port: inventoryPort});


    const loginCommand = `/l ${name}`;
    const anarchyCommand = `/an${anarchy}`;
    const shopCommand = '/shop';

    console.warn = () => {};

    bot.once('spawn', async () => {

        bot.mu = false;
        bot.startTime = Date.now() - 240000;
        bot.ahFull = false;
        bot.timeReset = Date.now();
        bot.login = true;
        bot.timeActive = Date.now();
        logger.info(`${name} успешно проник на сервер.`);
        await delay(minDelay);
        bot.chat(loginCommand);
        bot.timeLogin = Date.now()
        bot.inventoryFull = false;

        await delay(minDelay);
        bot.chat(anarchyCommand);

        await delay(minDelay);
        bot.chat(shopCommand);
    });

    bot.menu = chooseBuying;

    let slotToBuy = undefined;

    bot.on('physicsTick', async () => {
        if (Date.now() - bot.timeActive > 90000) {
            bot.timeActive = Date.now();
            bot.menu = analysisAH
            bot.mu = false;
            await safeAH(bot);
        }
    })

    bot.on('windowOpen', async () => {
        switch (bot.menu) {
            case chooseBuying:
                await delay(3000);
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionFarmer;

                await safeClick(bot, slotToChooseBuying, minDelay);

                break;

            case setSectionFarmer:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionFarmer;

                await safeClick(bot, slotToSetSectionFarmer, minDelay);

                break;

            case sectionFarmer:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionFood;

                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionFood:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionFood;

                await safeClick(bot, slotToSetSectionFood, minDelay);

                break;

            case sectionFood:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionResources;

                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionResources:
                bot.timeActive = Date.now();
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionResources;

                await delay(getRandomDelayInRange(1000, 2500));


                await safeClick(bot, slotToSetSectionResources, minDelay);

                break;

            case sectionResources:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setSectionLoot;

                await delay(getRandomDelayInRange(1000, 2500));


                await safeClick(bot, slotToLeaveSection, minDelay);

                break;

            case setSectionLoot:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = sectionLoot;

                await delay(getRandomDelayInRange(1000, 2500));

                await safeClick(bot, slotToSetSectionLoot, minDelay);

                break;

            case sectionLoot:
                bot.timeActive = Date.now();
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;
                await delay(5000);
                bot.closeWindow(bot.currentWindow);
                await delay(500);
                while(Date.now() - bot.timeLogin < 13000) await delay(1000)
                await safeAH(bot);

                break;


                case analysisAH:
                    bot.timeActive = Date.now();
                    generateRandomKey(bot);
                    const resetime = Math.floor((Date.now() - bot.timeReset) / 1000)
                    if (resetime > 60) {
                        logger.info(`${name} - ресет`);
                        await delay(500);
                        bot.menu = myItems;
                        await safeClick(bot, 46, getRandomDelayInRange(700, 1300))
    
                        break;
                    }
                    const uptime = Math.floor((Date.now() - bot.startTime) / 1000);  // Время в секундах
                    if (uptime > 240) {
                        logger.info(`${name} - продажа`);
                        await sellItems(bot)
    
                        break;
                    }
    
                    logger.info(`${name} - ${bot.menu}`);
                    await delay(1000);
    
                    switch (bot.inventoryFull) {
                        case true:
                            if (bot.ahFull) {
                                await longWalk(bot);
                                return
                            }
                            logger.error('Инвентарь заполнен')
                            await sellItems(bot)
                        
                            break;
    
                        case false:
                            logger.info(`${name} - поиск лучшего предмета`);
                            slotToBuy = await getBestAHSlot(bot);
    
                            switch (slotToBuy) {
                                case undefined:
                                    logger.info('не найден')
                                    bot.menu = analysisAH;
                                    await safeClick(bot, slotToReloadAH, getRandomDelayInRange(1000, 4000));
    
                                    break;
                                default:
                                    logger.info(`${name} - найден: ${slotToBuy}`);
                                    if (slotToBuy < 18) {
                                        await delay(getRandomDelayInRange(500, 1200));
                                    } else {
                                        await delay(getRandomDelayInRange(2000, 4000));
                                    }
                                    bot.menu = buy;
                                    await safeClick(bot, slotToBuy, 0);
    
                                    break;
                            }
                    }
    
                    break;
    
                    case buy:
                        bot.timeActive = Date.now();
                        logger.info(`${name} - ${bot.menu}`);
                      
                        bot.menu = analysisAH
                        await safeClick(bot, Math.floor(Math.random() * 3), getRandomDelayInRange(400, 500))
        
                        break;
    
            case myItems:
                bot.timeActive = Date.now();
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = setAH;

                await safeClick(bot, 52, getRandomDelayInRange(700, 1300))

                break;

            case setAH:
                bot.timeActive = Date.now();
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;
                bot.timeReset = Date.now();

                await safeClick(bot, 46, getRandomDelayInRange(700, 1300))

                break;
        }
    });

    // bot.on('kicked', () => {
    //     logger.error(`${name} спалился!`);
    // });


    bot.on('message', async (message) => {
        const messageText = message.toString();
        console.log(messageText)

        if (messageText.includes('[☃] Вы успешно купили') && !bot.ahFull) {
            await sellItems(bot)
            return
        }

        if (messageText.includes('[☃] У Вас купили')) {
            bot.ahFull = false;
            await sellItems(bot)
            return
        }
        if (messageText.includes('выставлен на продажу!')) {
            bot.inventoryFull = false
            return
        }
        if (messageText.includes('Не так быстро..')) {
            await delay(getRandomDelayInRange(500, 700));
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow);
            }
            await delay(getRandomDelayInRange(500, 700));
            bot.menu = analysisAH;
            await safeAH(bot);
            return
        }
        
        if (messageText.includes('[☃] У Вас полный инвентарь и Хранилище!')) {
            bot.inventoryFull = true;
            return
        }
        if (messageText.includes('[☃] Освободите хранилище или уберите предметы с продажи')) {
            bot.ahFull = true;
            return
        }

        if (messageText.includes('Добро пожаловать на FunTime.su') && bot.login) {
            logger.info(`${name} - зашел на сервер`);
            await delay(5000);
            bot.timeLogin = Date.now
            bot.chat(anarchyCommand)

            bot.ahFull = false;
            bot.mu = true;
            bot.menu = chooseBuying;
            await delay(1000);
            bot.chat(shopCommand)
            return
        }

        if (messageText.includes('[$] Ваш баланс:')) {
            let balanceStr = messageText
            if (messageText.includes('.')) {
                balanceStr = balanceStr.slice(0, -3)
            }
            balanceStr = balanceStr.replace(/\D/g, '')
            const balance = parseInt(balanceStr);
            if (isNaN(balance)) {
                logger.error('баланс NAN')
                return
            }
            if (balance - minBalance >= 1000000) {
                await delay(500)
                bot.chat(`/pay murad404 ${balance - minBalance}`)
                await delay(500)
                bot.chat(`/pay murad404 ${balance - minBalance}`)
            }
            return
        }
    })

    // bot.on('end', () => {
    //     logger.error(`${name} спалился!`);
    // })
}

async function sellItems(bot) {
    if (bot.mu) {
        if (bot.mu) {
            await delay(500)
            await safeAH(bot)
            return
        }
    }
    bot.mu = true;

    while (Date.now() - bot.timeLogin < 13000) await delay(1000)
    bot.timeActive = Date.now();

    if (bot.currentWindow) {
        bot.closeWindow(bot.currentWindow);
    }

    if (!bot.ahFull) {
        try {
            let items = new Array(9).fill(false); // Массив для отслеживания проданных предметов

            // Проверяем слоты продажи
            for (let sellSlot = firstSellSlot; sellSlot <= lastInventorySlot; sellSlot++) {
                const item = bot.inventory.slots[sellSlot];

                if (!item) {
                    // Ищем элитры для продажи в инвентаре
                    for (let invSlot = firstInventorySlot; invSlot <= lastInventorySlot; invSlot++) {
                        const invItem = bot.inventory.slots[invSlot];
                        if (!invItem || invItem?.name !== 'gold_ingot') continue;

                        // Перемещаем предмет в слот продажи
                        try {
                            await bot.moveSlotItem(invSlot, sellSlot);
                            items[sellSlot - firstSellSlot] = true;  // Обновляем флаг в массиве по индексу слота продажи
                            await delay(getRandomDelayInRange(1000, 1500));
                            break;  // Переходим к следующему пустому слоту продажи
                        } catch (error) {
                            logger.error(`Ошибка при перемещении предмета: ${error}`);
                            continue;
                        }
                    }
                } else {
                    // Если слот не пустой, проверяем, является ли это элитрой
                    items[sellSlot - firstSellSlot] = item?.name === 'gold_ingot';
                }
            }

            console.log(items)

            for (let i = 0; i < items.length; i++) { // Изменение здесь
                if (bot.ahFull) {
                    break;
                }
                if (!items[i]) continue;
                await delay(getRandomDelayInRange(500, 700));
                bot.setQuickBarSlot(i);
                await delay(getRandomDelayInRange(500, 700));
                bot.chat(`/ah sell ${priceSell}`);
            }
        } catch (error) {
            logger.error(`Ошибка в sellItems: ${error}`);
        }
    }

    logger.info(`${bot.username} - прогулка`);

    await delay(500)
    bot.chat('/balance')   
    await delay(500)
    await walk(bot)

    logger.info(`${bot.username} - прогулка закончена`);

    await delay(500)


    bot.startTime = Date.now();
    bot.mu = false;

    logger.info(`${bot.username} - мьютекс снят`);

    await delay(1000);
    bot.menu = analysisAH;  // Устанавливаем правильное меню
    await safeAH(bot);

}

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function safeClick(bot, slot, time) {
    await delay(time);

    if (bot.currentWindow) {
        bot.timeActive = Date.now();
        await bot.clickWindow(slot, leftMouseButton, noShift);
    }
}

function generateRandomKey(bot) {
    bot.key = Math.random().toString(36).substring(2, 15);
}

async function safeAH(bot) {
    if (bot.mu) return
    bot.timeActive = Date.now();
    let key = bot.key;
    bot.menu = analysisAH;
    while (key === bot.key) {
        bot.chat(ahCommand);
        await delay(1000);
    }
}

function inventoryFull(bot) {
    for (let i = firstInventorySlot; i <= lastInventorySlot; i++) {
        const slot = bot.inventory.slots[i];
        if (!slot) {
            return false;
        }
    }

    return true;
}

async function getBestAHSlot(bot) {
    if (!bot.currentWindow?.slots) {
        return undefined;
    }
    for (let i = firstAHSlot; i <= lastAHSlot; i++) {
        const slotData = bot.currentWindow?.slots[i];
        if (!slotData) continue;

        if (slotData.name !== 'golden_carrot' || slotData.count != 64) continue;
        

        try {
            const price = await getBuyPrice(slotData);
            if (!price || price > maxPrice) continue;

            return slotData.slot;
        } catch (error) {
            continue;
        }
    }
    
    return undefined;
}

async function getBuyPrice(slotData) {
    const loreArray = slotData.nbt?.value?.display?.value?.Lore?.value?.value;
    if (!loreArray) return undefined;
    
    for (const jsonString of loreArray) {
        const parsedData = JSON.parse(jsonString);
        
        // Проверяем есть ли extra массив
        if (!parsedData.extra) continue;
        
        // Проверяем каждый элемент в extra
        for (const element of parsedData.extra) {
            if (element.text && element.text.startsWith(' $')) {
                const priceString = element.text.replace(/\D/g, '');
                const price = parseInt(priceString);
                if (!isNaN(price)) return price;
            }
        }
    }
    
    logger.error('Цена не найдена')
    fs.writeFileSync('error.json', JSON.stringify(slotData, null, 2));

    return undefined;
}

function getRandomDelayInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (workerData) {
    launchElytraBuyer(workerData.username, workerData.password, workerData.anarchy, workerData.inventoryPort);
}

async function longWalk(bot) {
    bot.chat('/feed')
    bot.timeActive = Date.now();
    logger.info(`${bot.username} - все забито. Гуляем.`);
    while (bot.ahFull) {  // Гуляем пока ahFull === true
            bot.setControlState('jump', true);
            await delay(200);
            bot.setControlState('jump', false);
            await delay(10000)
    }

    logger.info(`${bot.username} - опять работать.`);
}


async function walk(bot) {
    await delay(500)
    bot.chat('/feed')
    await delay(500)
    
    bot.setControlState('jump', true);
    await delay(200);
    bot.setControlState('jump', false);
    
}
