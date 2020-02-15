const Discord = require('discord.js');
const bot = new Discord.Client();

const Logger = require('./utils/Logger');
const KanjiApi = require('./utils/KanjiAPI');
const KanjiCatch = require('./utils/KanjiCatch');
const KanjiUtils = require('./utils/KanjiUtils');

const GuildSettings = require('./models/Settings');
const KanjiInfoMessage = require('./models/KanjiInfoMessage');
const KanjiGuessMessage = require('./models/KanjiGuessMessage');
const PlayerScore = require("./models/PlayerScores");

const ResourcesManager = require('./resources/resources');

/*================================== CONSTANT STUFF =================================*/

const KANJI_API_URL = "https://kanjialive-api.p.rapidapi.com/api/public/kanji";

const resource_manager = new ResourcesManager();
const AUTH = resource_manager.loadAuth();
const LOGGER = new Logger();
const kanji_api = new KanjiApi(KANJI_API_URL, AUTH['KANJI_TOKEN']);
const kanji_utils = new KanjiUtils();

const MINUTE = 60 * 1000;
const PERSIST_SETTINGS_RATE = 1 // Every x minutes

/*===================================================================================*/
/*======================== NOT CONSTANT BUT STILL IMPORTANT =========================*/

// Kanji data
let kanji_per_grade = {}; // List of kanji's per grade, starting from grade 1 to grade 6

// Server settings for bot
let guild_settings = {}; // List of all server ids with their associated bot settings

// Remember how many kanji we know in total for shits and giggles
let total_kanji = 0;

// Kanji spawn chance in percentage.
let kanji_spawn_chance = 20;

/*===================================================================================*/

bot.on('ready', () => {

    LOGGER.log("This bot is online");

    // Load the guild settings
    resource_manager.loadSettings().then((settings) => {
        guild_settings = settings;
    }).catch((e) => {
        guild_settings = {}
        LOGGER.warn("Error loading settings", e)
    })

    // Load all Kanji's into memory
    for (let i = 1; i <= 6; i++) {
        resource_manager.loadKanjiGrade(i).then((k) => {
            total_kanji += k.length;
            kanji_per_grade[i] = k;
        });
    };

    // Persist guild settings every x minutes
    setInterval(() => {
        resource_manager.saveSettings(guild_settings).catch(() => {
            LOGGER.error("Failed saving settings", new Date())
        })
    }, PERSIST_SETTINGS_RATE * MINUTE)
});

bot.on('message', msg => {

    try {
        // If guild doesn't have a settings object yet, create one and add to list so all settings are in a single object (and can also be easily persisted)
        if (!guild_settings[msg.guild.id]) {
            guild_settings[msg.guild.id] = new GuildSettings(msg.guild.id);
        };

        if (msg.content.startsWith(guild_settings[msg.guild.id].prefix)  // If message starts with configured prefix
            && msg.author.id != bot.user.id                              // AND the message was not send by the bot
            && (!guild_settings[msg.guild.id].destination_channel        // AND (the destination channel was not set OR the channel equals the destination channel)
                || guild_settings[msg.guild.id].destination_channel === msg.channel.id)) {

            const args = msg.content.slice(guild_settings[msg.guild.id].prefix.length).split(' ');   // Remove prefix
            const command = args.shift().toLowerCase();                                              // Remove prefix        

            LOGGER.log(`Responding to command '${command}' issued by ${msg.author.username}`);

            switch (command) {
                /* ==========================================================================================================================================================*/
                // Bot says hello
                case "hello":
                    msg.channel.send("こんにちは  (◠‿◠✿)")
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Bot sends a new Kanji and resets the timer and ups the kanji index
                case "kanji":
                    msg.channel.send("行こう！");

                    if (guild_settings[msg.guild.id].kanji_index++ >= kanji_per_grade[guild_settings[msg.guild.id].grade].length) {
                        msg.channel.send(`You have reached the last kanji for grade ${guild_settings[msg.guild.id].grade}!`)
                        msg.channel.send(`I will start at the first kanji of this grade again. If you want to go to the next grade, use ${guild_settings[msg.guild.id].prefix}setgrade`)
                        guild_settings[msg.guild.id].kanji_index = 0;
                    }

                    // Get kanji
                    let kanji = kanji_per_grade[guild_settings[msg.guild.id].grade][guild_settings[msg.guild.id].kanji_index++];

                    // Send kanji to the channel
                    kanji_api.getKanjiInformation(kanji).then((kanji_data) => {
                        let message = new KanjiInfoMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));
                        msg.channel.send(message.createMessage());
                    }).catch((err) => {
                        msg.channel.send(`すみません, I failed to find information about '${kanji}'(˃̣̣̥﹏˂̣̣̥ ✿)`);
                        LOGGER.error(err);
                    })
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Bot calls Kanji API to find information about the provided kanji. Only supports single kanji as argument
                case "find":
                    if (args.length != 1) {
                        msg.channel.send("ごめんなさい, this command needs いち command");
                        break;
                    }
                    msg.channel.send(`I will do my best to find ${args[0]}`)

                    kanji_api.getKanjiInformation(args[0]).then((kanji_data) => {
                        let message = new KanjiInfoMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));
                        msg.channel.send(message.createMessage());
                    }).catch((err) => {
                        msg.channel.send(`すみません, I failed to find information about '${args[0]}'(˃̣̣̥﹏˂̣̣̥ ✿)`);
                        LOGGER.error(err);
                    })
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Force a random kanji spawn to guess/catch. User can send a grade 
                case "surprise":

                    // User can pass along a grade, if this grade is not valid, sent grade of channel
                    let surprise_grade = kanji_utils.isValidGrade(args[0]) ? args[0] : guild_settings[msg.guild.id].grade;

                    msg.channel.send("A random Kanji appeared!");

                    // Get kanji
                    let surprise_kanji = kanji_utils.randomKanji(kanji_per_grade[surprise_grade]);

                    // Send kanji to the channel
                    kanji_api.getKanjiInformation(surprise_kanji).then((kanji_data) => {
                        LOGGER.log(`Surpise kanji ${surprise_kanji} (${kanji_data.kanji.meaning["english"].split(",")}) has spawned in ${msg.guild.name}`)
                        let message = new KanjiGuessMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));

                        msg.channel.send(message.createMessage());

                        guild_settings[msg.guild.id].last_kanji_send = surprise_kanji;
                        guild_settings[msg.guild.id].last_kanji_send_grade = kanji_data.references.grade;

                    }).catch((err) => {
                        LOGGER.error(err);
                    });
                    break;

                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // 'Catch' a Kanji by guessing the English translation
                case "catch":
                    if (!guild_settings[msg.guild.id].last_kanji_send) {
                        msg.channel.send(`There is no kanji to catch!`)
                        break;
                    } else if (args.length != 1) {
                        msg.channel.send("ごめんなさい, this command needs いち command");
                        break;
                    }

                    kanji_api.getKanjiInformation(guild_settings[msg.guild.id].last_kanji_send).then((kanji_data) => {
                        // Sanitize the guess
                        let guess = args[0].trim().toLowerCase();
                        let kanji_catch = new KanjiCatch(guess, kanji_data);

                        // TODO: This needs to get refactored. Exceptions are now also caught be the promise catch method.
                        kanji_catch.isEnglishTranslation().then(() => {
                            msg.channel.send(`はい! ${msg.author.username}-さん, that's correct!`)
                            // guild_settings[msg.guild.id].last_kanji_send = null;

                            let message = new KanjiInfoMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));
                            msg.channel.send(message.createMessage());

                            // If channel has no player scores yet, init an empty one here for backwards compatability (new changes don't break already persisted settings)
                            if (!guild_settings[msg.guild.id].player_scores) {
                                guild_settings[msg.guild.id].player_scores = {};
                            }

                            // Update players score. If player doesn't have a score object yet, create one first, and then update it
                            if (!guild_settings[msg.guild.id].player_scores[msg.author.id]) {
                                guild_settings[msg.guild.id].player_scores[msg.author.id] = new PlayerScore();
                            }

                            // Grades are parsed as strings apparently, and using '+=' with int/strings leads to some weird concatanation
                            guild_settings[msg.guild.id].player_scores[msg.author.id].score += guild_settings[msg.guild.id].last_kanji_send_grade;
                            guild_settings[msg.guild.id].player_scores[msg.author.id].kanji_caught++;

                            msg.channel.send(`${msg.author.username}-さん now has a Kanji score of ${guild_settings[msg.guild.id].player_scores[msg.author.id].score} and has caught ${guild_settings[msg.guild.id].player_scores[msg.author.id].kanji_caught}`)
                        }).catch((err) => {
                            LOGGER.warn(err)
                            msg.channel.send("That is not correct..");
                        })
                    }).catch((err) => {
                        LOGGER.warn(err)
                        msg.channel.send("Something went wrong with this Kanji");
                    });

                    break;

                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Select a random kanji from the list and send it to the channel
                case "random":
                    let random_kanji = kanji_utils.randomKanji(kanji_per_grade[guild_settings[msg.guild.id].grade]);

                    kanji_api.getKanjiInformation(random_kanji).then((kanji_data) => {
                        let message = new KanjiInfoMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));
                        msg.channel.send(message.createMessage());
                    }).catch((err) => {
                        msg.channel.send(`すみません, I tried to surprise you with '${random_kanji}', but I failed (˃̣̣̥﹏˂̣̣̥ ✿)`);
                        LOGGER.error(err);
                    });
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Change the prefix required for the bot to take action
                case "score":
                    msg.channel.send(`${msg.author.username}-さん! You have a Kanji score of ${guild_settings[msg.guild.id].player_scores[msg.author.id].score} and caught a total of ${guild_settings[msg.guild.id].player_scores[msg.author.id].kanji_caught} Kanji!`);
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Change the prefix required for the bot to take action
                case "setprefix":
                    if (args.length != 1) {
                        msg.channel.send("ごめんなさい, this command needs いち command");
                        break;
                    }
                    guild_settings[msg.guild.id].prefix = args[0]
                    msg.channel.send("はい! Changed prefix!")
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Command to set the channel to bot listens to. If no channel is set, the bot will listen to every single channel.
                case "setchannel":
                    if (args.length != 1) {
                        msg.channel.send("ごめんなさい, this command needs いち command");
                        break;
                    };

                    // Make sure the provided channnel actually exists in this server.
                    let newChannel = msg.guild.channels.find((c) => {
                        return c.name.toLowerCase() === args[0].toLowerCase();
                    })

                    // If new channel doesn't exist, stop here.
                    if (!newChannel) {
                        msg.channel.send("Sorry, I couldn't find that channel. Does the channel exist?");
                        break;
                    }

                    // Add channel ID to corresponding server ID.
                    guild_settings[msg.guild.id].destination_channel = newChannel.id;
                    msg.channel.send(`I will now only listen to '${newChannel.name}'`)
                    LOGGER.log(`Guild '${msg.guild.name}' set channel to '${newChannel.name}'`)
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                case "setgrade":
                    if (kanji_utils.isValidGrade(args[0])) {
                        guild_settings[msg.guild.id].grade = args[0];
                        msg.channel.send(`Grade level has been set to ${guild_settings[msg.guild.id].grade}`)
                    } else {
                        msg.channel.send("That grade level is invalid. Grade level must be between 1 and 6.");
                    };
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                case "help":
                    msg.channel.send(
                        `
よろしくございます！ I am Kanji bot, I know ${total_kanji} kanji and together we will learn all of them  (◕ ˬ ◕✿)  Happy learning!

My commands are:
-hello
-kanji
-find (needs: kanji)
-random
-surprise
-catch (needs: string)
-setprefix (needs: string)
-setchannel (needs: valid channel name)
-setgrade (needs: number between 1-6)
-help

ケーキが好きだ (ꈍ ꒳ ꈍ✿)
                `);
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // 'Easter egg'
                case "cake":
                    msg.channel.send(`
（✿ ͡◕ ᴗ◕)つ━━✫・*。
⊂　　 ノ 　　　・゜+.
しーーＪ　　　°。+ *´¨)
.· ´𝔩𝔢𝔱 𝔱𝔥𝔢𝔯𝔢 𝔟𝔢 𝔠𝔞ᴋ𝔢☆´¨) ¸.·*¨)
(¸.·´ (¸.·’* (¸.·’* (¸.·’* (¸.·’* (¸.·’* *¨)
                `);
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Default to message that bot couldn't find a matching command
                default:
                    msg.channel.send(`すみません ${msg.author.username}-さん, I don't understand that`);
                    break;
            }
        }
        // If message wasn't meant for the bot, maybe send a kanji?:D
        else if (msg.author.id != bot.user.id) {
            // Get a random number between 0-100 and if the resulting number is lower or equals the spawn chance, spawn a kanji

            let random_number = Math.round(Math.random() * 100)

            if (random_number <= kanji_spawn_chance) {
                // Because the message was send in a random channel, we can't use the channel on the message object.
                // We have to find the reference to the destination channel via the guild object. Guild object contains a Channels list
                // with channel ID as the Key. Destination channel ID is saved in the guild settings.
                let dest_channel = msg.guild.channels.get(guild_settings[msg.guild.id].destination_channel)

                // Use the destination channel, if that isn't set, use the channel the message came from
                let channel = dest_channel || msg.channel;

                channel.send("A random Kanji appeared!");

                // Get kanji
                let random_kanji_index = Math.floor(Math.random() * Math.floor(kanji_per_grade[guild_settings[msg.guild.id].grade].length));
                let random_kanji = kanji_per_grade[guild_settings[msg.guild.id].grade][random_kanji_index]

                // Send kanji to the channel
                kanji_api.getKanjiInformation(random_kanji).then((kanji_data) => {
                    let message = new KanjiGuessMessage(kanji_data, resource_manager.getKanjiStrokeOrderGif(kanji_data.kanji.character));

                    channel.send(message.createMessage());

                    LOGGER.log(`Surpise kanji ${random_kanji} (${kanji_data.kanji.meaning["english"].split(",")}) has spawned in ${msg.guild.name}`)
                    channel.send(message.createMessage());

                    guild_settings[msg.guild.id].last_kanji_send = random_kanji;
                    guild_settings[msg.guild.id].last_kanji_send_grade = kanji_data.references.grade;
                }).catch((err) => {
                    LOGGER.error(err);
                });
            }
        }
    }
    catch (err) {
        LOGGER.error(err);
    }
});

bot.login(AUTH["DISCORD_TOKEN"]);