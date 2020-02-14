const Discord = require('discord.js');

module.exports = class KanjiInfoMessage {

    constructor(kanji_data, kanji_gif) {

        this.kanji_data = kanji_data;
        this.kanji_gif = kanji_gif;
    }

    createMessage() {

        const attachment = new Discord.Attachment(this.kanji_gif, 'kanji.gif');

        const embed = new Discord.RichEmbed()
            .setDescription(`Guess the Kanji using the catch command!`)
            // Random color for the message
            .setColor("#" + Math.random().toString(16).slice(2, 8))

            // Add attachment file and set image of message to the attachment
            .attachFile(attachment)
            .setImage('attachment://kanji.gif');

        return embed;
    }
}