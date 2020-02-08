const Discord = require('discord.js');
const bot = new Discord.Client();
const axios = require('axios');
const Logger = require('./logger');
const LOGGER = new Logger();
const GuildSettings = require('./settings');
const ResourcesManager = require('./resources/resources');

/*================================== CONSTANT STUFF =================================*/

const resource_manager = new ResourcesManager();
const AUTH = resource_manager.loadAuth();
const KANJI_API_URL = "https://kanjialive-api.p.rapidapi.com/api/public/kanji";

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
let kanji_spawn_chance = 5

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

    // Persist guild settings every 5 minutes
    setInterval(() => {
        resource_manager.saveSettings(guild_settings).then(() => {
            LOGGER.log("Successfully saved settings", new Date())
        }).catch(() => {
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
                    sendKanji(kanji, msg.channel);
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
                    sendKanji(args[0], msg.channel);
                    break;
                /* ==========================================================================================================================================================*/
                /* ==========================================================================================================================================================*/
                // Select a random kanji from the list and send it to the channel
                case "random":
                    let random_kanji_index = Math.floor(Math.random() * Math.floor(kanji_per_grade[guild_settings[msg.guild.id].grade].length));
                    sendKanji(kanji_per_grade[guild_settings[msg.guild.id].grade][random_kanji_index], msg.channel);
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
                // Set the amount of examples the bot sends whenever it sends a kanji
                case "setexamples":
                    if (args.length != 1) {
                        msg.channel.send("ごめんなさい, this command needs いち command");
                        break;
                    } else if (isNaN(args[0])) {
                        msg.channel.send("ばか！ That's not a number!");
                        break;
                    } else if (args[0] < 0) {
                        msg.channel.send("いいえ。");
                        break;
                    } else if (args[0] == 0) {
                        msg.channel.send("I won't send any examples anymore..");
                        guild_settings[msg.guild.id].kanji_examples = args[0];
                        break;
                    }
                    guild_settings[msg.guild.id].kanji_examples = args[0];
                    msg.channel.send(`I will now send ${guild_settings[msg.guild.id].kanji_examples} example(s) with every kanji!`)
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
                    if (args[0] > 0 && args[0] <= 6 && !isNaN(args[0])) {
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
-setprefix (needs: string)
-setexamples (broken)
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
                    throw 'NO';
                    msg.channel.send(`すみません ${msg.author.username}さん, I don't understand that`);
                    break;
            }
        }
        // If message wasn't meant for the bot, maybe send a kanji?:D
        else if (msg.author.id != bot.user.id) {
            // Get a random number between 0-100 and if the resulting number is lower or equals the spawn chance, spawn a kanji

            let random_number = Math.round(Math.random() * 100)

            LOGGER.log(`Random number: ${random_number}, spawn chance: ${kanji_spawn_chance}`)

            if (random_number <= kanji_spawn_chance) {
                // Because the message was send in a random channel, we can't use the channel on the message object.
                // We have to find the reference to the destination channel via the guild object. Guild object contains a Channels list
                // with channel ID as the Key. Destination channel ID is saved in the guild settings.
                let channel = msg.guild.channels.get(guild_settings[msg.guild.id].destination_channel)
                channel.send("A random Kanji appeared!");

                // Get kanji
                let kanji = kanji_per_grade[guild_settings[msg.guild.id].grade][guild_settings[msg.guild.id].kanji_index++];

                // Send kanji to the channel
                sendKanji(kanji, channel);
            }
        }
    }
    catch (err) {
        LOGGER.error(err);
    }
});

// Function that takes a kanji and retrieves information about it and sends it to the channel
function sendKanji(kanji, channel) {

    LOGGER.log(`Retrieving info about ${kanji}`)

    axios.get(`${KANJI_API_URL}/${encodeURI(kanji)}`,
        {
            headers: {
                "x-rapidapi-host": "kanjialive-api.p.rapidapi.com",
                "x-rapidapi-key": AUTH["KANJI_TOKEN"]
            }
        }
    ).then((res) => {

        const kanji_data = res.data.kanji;

        // Create file attachment object
        const attachment = new Discord.Attachment(resource_manager.getKanjiStrokeOrderGif(kanji), 'kanji.gif');

        const embed = new Discord.RichEmbed()
            .setTitle(`${kanji}  -  Grade ${res.data.references.grade}  -  English: '${kanji_data.meaning["english"]}' `)

            // Random color for the message
            .setColor("#" + Math.random().toString(16).slice(2, 8))

            .addField(`**Onyomi** (Chinese)`,
                `
                ${Object.keys(kanji_data.onyomi)[0]}:   ${Object.values(kanji_data.onyomi)[0]}
                ${Object.keys(kanji_data.onyomi)[1]}:   ${Object.values(kanji_data.onyomi)[1]}
                `, true)
            .addField(`**Kunyomi** (Japanese)`,
                `
                ${Object.keys(kanji_data.kunyomi)[0]}:  ${Object.values(kanji_data.kunyomi)[0]}
                ${Object.keys(kanji_data.kunyomi)[1]}:  ${Object.values(kanji_data.kunyomi)[1]}
                `, true)

            // To make sure the examples don't get behind Kunyomi
            .addBlankField()

            // Add attachment file and set image of message to the attachment
            .attachFile(attachment)
            .setImage('attachment://kanji.gif');

        // If kanji examples are enabled, add examples to the message on a new line
        if (guild_settings[channel.guild.id].kanji_examples > 0) {
            for (let i = 0; i < guild_settings[channel.guild.id].kanji_examples; i++) {
                embed.addField(`**Example ${i + 1}**`,
                    `${res.data.examples[i].japanese}
                ${res.data.examples[i].meaning["english"]}`, true);
            };
        }

        channel.send(embed);

    }).catch((err) => {
        channel.send(`I failed to find information about '${kanji}'(˃̣̣̥﹏˂̣̣̥ ✿)`)
        LOGGER.warn("Axios error:", err);
        LOGGER.warn("Url that failed:", `${KANJI_API_URL} /${encodeURI(kanji)}`)
    });
}

bot.login(AUTH["DISCORD_TOKEN"]);