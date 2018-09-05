# BaeBot

Personal Discord bot just for messing around.

Coded with JavaScript following the tutorial for Discord JS: https://discordjs.guide/#/

If you want to use the bot for personal use, add a file named `config.json` to the root and add your App Token ( and a prefix if applicable) as:

```
{
  token: "YOUR_TOKEN",
  prefix: "YOUR_PREFIX",
  osuApiKey: "YOUR_OSU_API_KEY" //if you wish to use the osu commands!
}
```

There's a few custom, replying to ID commands in `index.js` of which the keys are found `config.js` too.
Also the database used is Firebase, Google's mobile database. The URL is private and in `config.js`
