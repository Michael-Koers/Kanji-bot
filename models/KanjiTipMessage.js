const Discord = require('discord.js');

module.exports = class KanjiTipMessage {

    constructor(kanji_data) {

        this.kanji_data = kanji_data;
    }

    createMessage() {

        let amount_of_solutions = this.kanji_data.kanji.meaning["english"].split(",").length;
        let possible_solutions = this.kanji_data.kanji.meaning["english"].split(",");

        for (let i = 0; i < possible_solutions.length; i++) {
            let solution = possible_solutions[i].trim();
            possible_solutions[i] = solution[0] + solution.slice(1).replace(/./g, ' .');
        }

        const embed = new Discord.RichEmbed()
            .setDescription(`A little help to catch kanji  ${this.kanji_data.kanji.character}!`)
            // Random color for the message
            .setColor("#" + Math.random().toString(16).slice(2, 8))

            .addField(`**Number of solutions**`, `${amount_of_solutions}`);

        for (let i = 0; i < possible_solutions.length; i++) {
            embed.addField(`**Solution ${i + 1}**`,
                `${possible_solutions[i]}`);
        };

        return embed;

    }
}