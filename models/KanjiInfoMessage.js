const Discord = require('discord.js');

module.exports = class KanjiInfoMessage {

    constructor(kanji_data, kanji_gif) {

        this.kanji_data = kanji_data;
        this.kanji_gif = kanji_gif;
    }

    createMessage() {

        const attachment = new Discord.Attachment(this.kanji_gif, 'kanji.gif');

        const embed = new Discord.RichEmbed()
            .setTitle(`${this.kanji_data.kanji.character}  -  Grade ${this.kanji_data.references.grade}  -  English: '${this.kanji_data.kanji.meaning["english"]}' `)

            // Random color for the message
            .setColor("#" + Math.random().toString(16).slice(2, 8))

            .addField(`**Onyomi** (Chinese)`,
                `
            ${Object.keys(this.kanji_data.kanji.onyomi)[0]}:   ${Object.values(this.kanji_data.kanji.onyomi)[0]}
            ${Object.keys(this.kanji_data.kanji.onyomi)[1]}:   ${Object.values(this.kanji_data.kanji.onyomi)[1]}
            `, true)
            .addField(`**Kunyomi** (Japanese)`,
                `
            ${Object.keys(this.kanji_data.kanji.kunyomi)[0]}:  ${Object.values(this.kanji_data.kanji.kunyomi)[0]}
            ${Object.keys(this.kanji_data.kanji.kunyomi)[1]}:  ${Object.values(this.kanji_data.kanji.kunyomi)[1]}
            `, true)

            // To make sure the examples don't get behind Kunyomi
            .addBlankField()

            // Add attachment file and set image of message to the attachment
            .attachFile(attachment)
            .setImage('attachment://kanji.gif');

        for (let i = 0; i < 3; i++) {
            embed.addField(`**Example ${i + 1}**`,
                `${this.kanji_data.examples[i].japanese}
                ${this.kanji_data.examples[i].meaning["english"]}`, true);
        };
        return embed;
    }
}