module.exports = class KanjiCatch {

    constructor(guess, kanji_data) {
        this.guess = guess;
        this.kanji_data = kanji_data;
    }

    isEnglishTranslation() {
        return new Promise((resolve, reject) => {
            let acceptable_answers = this.kanji_data.kanji.meaning["english"].split(",");

            for (let i = 0; i < acceptable_answers.length; i++) {
                // Sanitize acceptable answers
                acceptable_answers[i] = acceptable_answers[i].trim().toLowerCase();
            }

            if (acceptable_answers.includes(this.guess)) {
                resolve("User send correct answer");
            } else {
                reject("User send incorrect answer");
            }
        })
    }
}