module.exports = class GuildSettings {

    constructor(guild_id) {
        this.guild_id = guild_id;
        this.prefix = 'k.';
        this.destination_channel = null;

        this.grade = 1;

        this.kanji_examples = 3;
        this.kanji_index = 0;

        this.last_kanji_send = '';
    }
}