# About

Kanji-bot is a project started by ANCIENTDOOM for his awesome Discord server filled with weebs that want to learn Japanese.
ANCIENT also happens to be a programmer and in need for an excuse to have a side-project and an excuse to be slacking on his Japanese learning progress so here we are.
Kanji-bot is a bot that 'tries' to learn people some Japanese Kanji and is currently still in an pre-alpha-alpha state.

Bot supports running in multiple servers and persists settings every minute so they aren't lost. 

# Set-up (Script)

Download the sources and in the main directory execute:
```
npm install
```
To download all the required packages.

# Set-up (Bot)

When Kanji-bot first joins your server it will

- Have prefix 'k.'
- Listens to all channels
- Start on Kanji Grade 1

To change prefix, issue:
```
k.setprefix [PREFIX]
```

To set a specific channel for Kanji-bot, issue:
```
k.setchannel [CHANNEL_NAME]
```

To change the Kanji grade, issue:
```
k.setgrade [GRADE_LEVEL]
```
There are 6 grades in total, ranging from 1 to 6. For more information search for JLPT levels or for [example this link](https://kanjicards.org/kanji-lists.html)

# Contribution

If you want to contribute please do so by forking and pull requests!
