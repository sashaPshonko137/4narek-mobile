import fs from 'fs/promises';
import mineflayer from 'mineflayer';
import inventoryViewer from 'mineflayer-web-inventory';
import { createLogger, transports, format } from 'winston';
import { workerData, parentPort } from 'worker_threads';
import { loader as autoEat } from 'mineflayer-auto-eat'


const minDelay = 500;
const AHDelay = 2000;
const loadingDelay = 100;

const chooseBuying = 'Выбор скупки ресурсов';
const setSectionFarmer = 'Установка секции "фермер"';
const sectionFarmer = 'Секция "фермер"';
const setSectionFood = 'Установка секции "еда"';
const sectionFood = 'Секция "еда"';
const setSectionResources = 'Установка секции "ценные ресурсы"';
const sectionResources = 'Секция "ценные ресурсы"';
const setSectionLoot = 'Установка секции "добыча"';
const sectionLoot = 'Секция "добыча"';
const analysisAH = 'Анализ аукциона';
const buy = 'Покупка';
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

const ahCommand = '/ah search elytra';

let type = ""

const itemPrices = [
    {
    "name": "elytra",
    "id": "elytra",
    "effects": [
    ],
    "priceBuy": 900000,
    "priceSell": 1300000,
    },
    {
    "name": "elytra",
    "id": "elytra-unbreak",
    "effects": [
        {
            "name": "minecraft:unbreaking",
            "lvl": 5
        },
    ],
    "priceBuy": 1700000,
    "priceSell": 2200000,
    },
    // {
    // "name": "elytra",
    // "id": "elytra-onlymend",
    // "effects": [
    //     {
    //         "name": "minecraft:mending",
    //         "lvl": 1
    //     },
    // ],
    // "priceBuy": 1200000,
    // "priceSell": 1600000,
    // },
    {
    "name": "elytra",
    "id": "elytra-mend",
    "effects": [
        {
            "name": "minecraft:unbreaking",
            "lvl": 5
        },
        {
            "name": "minecraft:mending",
            "lvl": 1
        },
    ],
    "priceBuy": 3000000,
    "priceSell": 4000000,
    },
]

const missingEnchantsNames = ["minecraft:knockback", "heavy", "unstable"]

const minBalance = 20000000

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


async function launchBookBuyer(name, password, anarchy, inventoryPort) {
    const bot = mineflayer.createBot({
        host: 'mc.funtime.su',
        port: 25565,
        username: name,
        password: password,
        version: '1.16.5',
    });



    const loginCommand = `/l ${name}`;
    const anarchyCommand = `/an${anarchy}`;
    const shopCommand = '/shop';

    console.warn = () => {};

    bot.once('spawn', async () => {
        const msg = `${bot.username} запущен!` 
        parentPort.postMessage(msg);
        bot.loadPlugin(autoEat)
        bot.mu = false;
        bot.startTime = Date.now() - 55000;
        bot.ahFull = false;
        bot.timeReset = Date.now()
        bot.login = true;
        bot.timeActive = Date.now();
        bot.inventoryFull = false;
        bot.timeLogin = Date.now()
        bot.prices = []
        bot.count = 0
        bot.netakbistro = true
        bot.ah = []
        
        logger.info(`${name} успешно проник на сервер.`);
        await delay(minDelay);
        bot.chat(loginCommand);

        await delay(minDelay);
        bot.chat(anarchyCommand);

        await delay(minDelay);
        bot.chat(shopCommand);
    });

    bot.on('physicsTick', async () => {
        if (Date.now() - bot.timeActive > 90000) {
            bot.timeActive = Date.now();
            bot.menu = analysisAH
            bot.mu = false;
            await safeAH(bot);
        }
    })

    bot.menu = chooseBuying;

    let slotToBuy = undefined;

    bot.startTime = Date.now() - 240000;


    bot.on('windowOpen', async () => {
        switch (bot.menu) {
            case chooseBuying:
                const msg = {name: 'success', username: bot.username};
                parentPort.postMessage(msg);
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
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;
                await delay(5000);
                bot.closeWindow(bot.currentWindow);
                await delay(500);

                while (Date.now() - bot.timeLogin < 13000) {
                    await delay(1000)
                }
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
                    if (uptime > 55) {
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
                            let slotToBuy = await getBestAHSlot(bot, itemPrices);
                            
                            switch (slotToBuy) {
                                case null:
                                    logger.info('не найден')
                                    bot.menu = analysisAH;
                                    await safeClick(bot, slotToReloadAH, getRandomDelayInRange(1000, 1500));
    
                                    break;
                                default:
                                    if (bot.netakbistro) {
                                        bot.netakbistro = false;
                                        await safeClickBuy(bot, slotToBuy, 1100);
                                    } else if (slotToBuy < 18) {
                                        await safeClickBuy(bot, slotToBuy, getRandomDelayInRange(100, 150));
                                    } else {
                                       await safeClick(bot, slotToReloadAH, getRandomDelayInRange(1000, 1500));
                                    }
                                    

    
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
                logger.info(`${name} - ${bot.menu}`);
                bot.count = 0
                bot.ah = []
                for (let i = 0; i < 8; i++) {
                    if (bot.currentWindow?.slots[i]) {bot.count++} else break
                    const id = getID(bot.currentWindow?.slots[i], itemPrices)
                    bot.ah.push(id)
                }
                bot.menu = setAH;
                bot.timeReset = Date.now()

                await safeClick(bot, 52, getRandomDelayInRange(700, 1300))

                break;

            case setAH:
                logger.info(`${name} - ${bot.menu}`);
                bot.menu = analysisAH;

                await safeClick(bot, 46, getRandomDelayInRange(700, 1300))

                break;
        }
    });

    bot.on('message', async (message) => {
        const messageText = message.toString();
        console.log(messageText)

        if (messageText.includes('[☃] Вы успешно купили') && !bot.ahFull) {
            await sendBuy(bot.type)
            await sellItems(bot)
            return
        }

        if (messageText.includes('Сервер заполнен')) {
            bot.mu = false;
            bot.startTime = Date.now() - 240000;
            bot.ahFull = false;
            bot.timeReset = Date.now() - 60000;
            bot.login = true;
            bot.timeActive = Date.now();
            bot.inventoryFull = false;
            bot.timeLogin = Date.now()
            bot.prices = []
            bot.count = 0
            bot.netakbistro = true

            await delay(minDelay);
            bot.chat(anarchyCommand);
        }

        if (messageText.includes('[☃] У Вас купили')) {
            bot.ahFull = false;
            await sellItems(bot)
            return
        }
        if (messageText.includes('[☃]') && messageText.includes('выставлен на продажу!')) {
            await sendSell(type)
            bot.inventoryFull = false
            bot.count++
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
        }//Данная команда недоступна в режиме AFK
        if (messageText.includes('Данная команда недоступна в режиме AFK')) {
            await delay(getRandomDelayInRange(500, 700));
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow);
            }
            await delay(getRandomDelayInRange(500, 700));
            await walk(bot)
            await delay(getRandomDelayInRange(500, 700));
            bot.menu = analysisAH;
            await safeAH(bot)
            return
        }//[☃] После входа на режим необходимо немного подождать перед использованием аукциона. Подождите
            if (messageText.includes('[☃] После входа на режим необходимо немного подождать перед использованием аукциона. Подождите')) {
            await delay(getRandomDelayInRange(500, 700));
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow);
            }
            await walk(bot)
            await delay(10000);
            bot.menu = analysisAH;
            await safeAH(bot);
            return
        }
        if (messageText.includes('[☃] Освободите хранилище или уберите предметы с продажи')) {
            bot.ahFull = true;
            return
        }

        if (messageText.includes('[☃] У Вас не хватает денег!')) {
            await delay(getRandomDelayInRange(500, 700));
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow);
            }
            await delay(getRandomDelayInRange(500, 700));
            bot.chat('/clan withdraw 5000000')
            await delay(getRandomDelayInRange(500, 700));
            bot.menu = analysisAH;
            await safeAH(bot);
        }

        if (messageText.includes('Добро пожаловать на FunTime.su') && bot.login) {
            logger.info(`${name} - зашел на сервер`);
            await delay(5000);
            bot.timeLogin = Date.now()
            bot.chat(anarchyCommand)

            bot.ahFull = false;
            bot.mu = true;
            bot.menu = chooseBuying;

            await delay(1000);
            bot.chat(shopCommand)
            return
        }

        if (messageText.includes('[☃] У Вас полный инвентарь и Хранилище!')) {
            bot.inventoryFull = true;
            return
        }

        if (messageText.includes('выставлен на продажу!')) {
            bot.inventoryFull = false
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
            if (balance - minBalance >= 10000000) {
                await delay(500)
                bot.chat(`/clan invest ${balance - minBalance}`)
            }
            return
        }
    })
}

async function sendSell(text) {
  try {
    await fetch('http://31.207.74.231:8080/sell_shue', {
      method: 'POST',
      body: JSON.stringify({ type: text }), // Отправляем как JSON с полем type
      headers: {
        'Content-Type': 'application/json' // Указываем что отправляем JSON
      }
    });
  } catch (e) {
    console.log('Ошибка отправки:', e.message);
  }
}

async function sendBuy(text) {
  try {
    await fetch('http://31.207.74.231:8080/buy_shue', {
      method: 'POST',
      body: JSON.stringify({ type: text }), // Отправляем как JSON с полем type
      headers: {
        'Content-Type': 'application/json' // Указываем что отправляем JSON
      }
    });
  } catch (e) {
    console.log('Ошибка отправки:', e.message);
  }
}

function getIdBySellPrice(itemPrices, targetPrice) {
    // Ищем предмет с точным совпадением цены
    const foundItem = itemPrices.find(item => item.priceSell === targetPrice);
    
    // Если нашли - возвращаем id, иначе null
    return foundItem ? foundItem.id : null;
}

async function sellItems(bot) {
    const sellLimit = 8 - bot.count; // Максимальное количество предметов для продажи
    let itemsSold = 0; // Счетчик проданных предметов

    if (bot.mu) {
        await delay(500);
        await safeAH(bot);
        return;
    }

    bot.mu = true;

    try {
        // Ожидание после логина
        while (Date.now() - bot.timeLogin < 13000) {
            await delay(1000);
        }
        bot.timeActive = Date.now();

        // Закрытие всех окон перед началом
        if (bot.currentWindow) {
            bot.closeWindow(bot.currentWindow);
            await delay(getRandomDelayInRange(300, 500));
        }

        // Продажа предметов только если AH не заполнен и не достигнут лимит
        if (!bot.ahFull && itemsSold < sellLimit) {
            // 1. Сначала проверяем быструю панель (горячие слоты)
            for (let quickSlot = 0; quickSlot < 9; quickSlot++) {
                if (bot.ahFull || itemsSold >= sellLimit) break;
                
                const slotIndex = firstSellSlot + quickSlot;
                const item = bot.inventory.slots[slotIndex];
                
                if (!item) continue;
                
                const price = getBestSellPrice(item, itemPrices);
                if (price > 0) {
                    // Подготовка и продажа
                    if (bot.quickBarSlot !== quickSlot) {
                        await bot.setQuickBarSlot(quickSlot);
                        await delay(getRandomDelayInRange(400, 600));
                    }
                    bot.chat(`/ah sell ${price}`);
                    itemsSold++;
                    await delay(getRandomDelayInRange(600, 800));
                } else {
                    // Выбрасывание невалидного предмета
                    await bot.tossStack(item);
                    await delay(getRandomDelayInRange(300, 500));
                }
            }

            // 2. Затем проверяем основной инвентарь
            if (!bot.ahFull && itemsSold < sellLimit) {
                let sellSlot = null;
                for (let i = 0; i < 9; i++) {
                    if (!bot.inventory.slots[i+firstSellSlot]) {
                        sellSlot = i;
                        break;
                    }
                }
                if (sellSlot !== null) {
                    for (let inventorySlot = 0; inventorySlot < 27; inventorySlot++) {
                        if (bot.ahFull || itemsSold >= sellLimit) break;
                    
                        const item = bot.inventory.slots[inventorySlot];
                        if (!item) continue;
                    
                        const price = getBestSellPrice(item, itemPrices);
                        if (price > 0) {
                            // Переносим в первый слот быстрой панели и продаем
                            await bot.setQuickBarSlot(sellSlot);
                            await delay(300);
                            await bot.moveSlotItem(inventorySlot, firstSellSlot + sellSlot);
                            await delay(getRandomDelayInRange(500, 700));
                        
                            bot.chat(`/ah sell ${price}`);
                            itemsSold++;
                            await delay(getRandomDelayInRange(600, 800));
                            break; // После успешной продажи прерываем цикл
                        } else {
                            // Выбрасывание невалидного предмета
                            await bot.tossStack(item);
                            await delay(getRandomDelayInRange(300, 500));
                        }
                    }
                }
            }
        }
    } catch (error) {
        logger.error(`${bot.username} - Ошибка в sellItems: ${error.stack || error}`);
    } finally {
        // Пост-обработка
        logger.info(`${bot.username} - завершение продажи (продано ${itemsSold}/${sellLimit} предметов)`);
        await delay(500);
        
        bot.chat('/balance');
        await delay(500);
        
        await walk(bot);
        logger.info(`${bot.username} - прогулка завершена`);
        
        bot.startTime = Date.now();
        bot.mu = false;
        logger.info(`${bot.username} - мьютекс снят`);
        
        await delay(1000);
        bot.menu = analysisAH;
        await safeAH(bot);
    }
}
/**
 * Находит лучшую цену продажи для предмета на основе зачарований.
 * @param {Object} item - Предмет (из inventory.slots или window.slots).
 * @param {Array} itemPrices - Конфиг с шаблонами цен.
 * @returns {number} Цена продажи (или 0, если предмет не подходит под конфиг).
 */
function getBestSellPrice(item, itemPrices) {
    const sortedConfig = [...itemPrices].sort((a, b) => b.priceSell - a.priceSell);
    for (const configItem of sortedConfig) {
        if (itemMatchesConfig(item, configItem)) {
            type = configItem.id;
            return configItem.priceSell;
        }
    }
    return 0;
}

function getID(item, itemPrices) {
    // if (!item || !itemPrices?.length) return 0;

    // Сортируем конфиг по priceSell (от большего к меньшему)
    const sortedConfig = [...itemPrices].sort((a, b) => b.priceSell - a.priceSell);

    // 1. Проверяем предмет против ВСЕХ шаблонов конфига
    for (const configItem of sortedConfig) {
        // 1.1. Проверка названия
        if (item.name !== configItem.name) continue;

        // // 1.2. Проверка зачарований (гибкая)
        const enchantments = item.nbt?.value?.Enchantments?.value?.value || [];
        const customEnchantments = item.nbt?.value?.['custom-enchantments']?.value?.value || [];
        
        const allEnchants = [
            ...enchantments.map(e => ({ name: e.id?.value, lvl: e.lvl?.value })),
            ...customEnchantments.map(e => ({ name: e.type?.value, lvl: e.level?.value }))
        ];

        const areEnchantsValid = configItem.effects?.every(required => {
            const foundEnchant = allEnchants.find(e => e.name === required.name);
            if (!foundEnchant) return false; // Нет такого зачарования
            return foundEnchant.lvl >= required.lvl; // Уровень >= требуемого
        });

        if (!areEnchantsValid) continue;
        // 2. Нашли подходящий шаблон — возвращаем его priceSell!
        return configItem.id;
    }

    return 0; // Предмет не подходит под конфиг
}

function generateRandomKey(bot) {
    bot.key = Math.random().toString(36).substring(2, 15);
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

async function safeAH(bot) {
    if (bot.mu) return
    bot.netakbistro = true
    let key = bot.key;
    bot.timeActive = Date.now();
    bot.menu = analysisAH
    while (key === bot.key) {
        bot.chat(ahCommand);
        await delay(1000);
    }
}

async function getBestAHSlot(bot, itemPrices) {
    if (!bot.currentWindow?.slots) return null;

    const sortedConfig = [...itemPrices].sort((a, b) => b.priceBuy - a.priceBuy);
    
    for (let slot = firstAHSlot; slot <= 17; slot++) {
        const slotData = bot.currentWindow.slots[slot];
        if (!slotData) continue;

        for (const configItem of sortedConfig) {
            if (!itemMatchesConfig(slotData, configItem)) continue;
            
            try {
                const price = await getBuyPrice(slotData);
                if (!price || price >= configItem.priceBuy) continue;
                
                // const count = bot.ah.filter(name => name === configItem.id).length;
                // if (count >= 4) {
                //     logger.info(`уже есть 4 ` + configItem.id)
                //     return null;
                // }
                
                bot.type = configItem.id;
                if (!bot.type) logger.error('id undefined');
                return slotData.slot;
            } catch (error) {
                continue;
            }
        }
    }
    return null;
}

function itemMatchesConfig(item, configItem) {
    // Проверка имени
    if (item.name !== configItem.name) return false;
    
    // Проверка зачарований
    const enchantments = item.nbt?.value?.Enchantments?.value?.value || [];
    const customEnchantments = item.nbt?.value?.['custom-enchantments']?.value?.value || [];
    
    const allEnchants = [
        ...enchantments.map(e => ({ name: e.id?.value, lvl: e.lvl?.value })),
        ...customEnchantments.map(e => ({ name: e.type?.value, lvl: e.level?.value }))
    ];

    // Проверка требуемых зачарований
    const areEnchantsValid = configItem.effects?.every(required => {
        const foundEnchant = allEnchants.find(e => e.name === required.name);
        return foundEnchant && foundEnchant.lvl >= required.lvl;
    });
    
    if (!areEnchantsValid) return false;
    if (allEnchants.some(en => missingEnchantsNames.includes(en.name))) return false;

    // Проверка прочности
    if (item.maxDurability && !enchantments.some(en => en.name === 'minecraft:mending')) {
        const damage = item.nbt?.value?.Damage?.value || 0;
        const durabilityLeft = item.maxDurability - damage;
        if (durabilityLeft < item.maxDurability * 0.9) return false;
    }

    return true;
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
    launchBookBuyer(workerData.username, workerData.password, workerData.anarchy, workerData.inventoryPort);
}

function getRandomElement(array) {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error("Input must be a non-empty array");
  }
  
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

async function longWalk(bot) {
    await delay(500)
    let timeTP = Date.now()
    bot.autoEat.enableAuto()
    bot.timeActive = Date.now();
    logger.info(`${bot.username} - все забито. Гуляем.`);
    while (bot.ahFull) {  // Гуляем пока ahFull === true
        const resetime = Math.floor((Date.now() - bot.timeReset) / 1000)
        if (resetime > 60) {
            await delay(500);
            ['forward', 'back', 'left', 'right'].forEach(move => 
                bot.setControlState(move, false)
            );
            await delay(500);
            await safeAH(bot);
            bot.autoEat.disableAuto()

            return
        }

        // Случайное движение
        const movements = ['forward', 'back', 'left', 'right'];
        const randomMove = movements[Math.floor(Math.random() * movements.length)];
        bot.setControlState(randomMove, true);
        await delay(500);
        bot.setControlState(randomMove, false);
        if (Date.now() - timeTP > 10000) {
            await delay(500)
            timeTP = Date.now()
            const warps = ['fisher', 'mine', 'casino', 'case', 'portal', 'shop']
            const warp = getRandomElement(warps)
            bot.chat(`/warp ${warp}`)
            await delay(6000)
        }
        
        await delay(500);
    }

    logger.info(`${bot.username} - опять работать.`);

    // Останавливаем все движения когда ahFull стал false
    ['forward', 'back', 'left', 'right'].forEach(move => 
        bot.setControlState(move, false)
    );

    bot.autoEat.disableAuto()
}

async function walk(bot) {
    await delay(500)
    bot.autoEat.enableAuto()
    const endTime = Date.now() + 4000;

    while (Date.now() < endTime) {
        
        // Случайное движение
        const movements = ['forward', 'back', 'left', 'right'];
        const randomMove = movements[Math.floor(Math.random() * movements.length)];
        bot.setControlState(randomMove, true);
        await delay(500);
        bot.setControlState(randomMove, false);
        
        
        await delay(500);
    }
    
    // Останавливаем все движения
    ['forward', 'back', 'left', 'right'].forEach(move => 
        bot.setControlState(move, false)
    );

    const warps = ['fisher', 'mine', 'casino', 'case', 'portal', 'shop']
    const warp = getRandomElement(warps)
    bot.chat(`/warp ${warp}`)
    await delay(6000)

    bot.autoEat.disableAuto()

}

async function safeClickBuy(bot, slot, time) {
    await delay(time);

    if (bot.currentWindow) {
        bot.timeActive = Date.now();
        await bot.clickWindow(slot, leftMouseButton, 1);
    }
}