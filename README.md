# BaeBot

Discord bot coded in JavaScript primarily with osu! integrations

*Database is configured with [nedb](https://github.com/louischatriot/nedb), requiring no additional setup!*
___

## Running locally

To run BaeBot, it is assumed you have the following:
- Node
- npm

**1. Clone the repo**
```
$ git clone https://github.com/DMills94/BaeBot.git
```

**2. Install required packages**
```
$ cd BaeBot
$ npm i
```

**3. Add config.json**

Add a file named `config.json` at the root of the project.
```
$ touch config.json
```

Into the file, create an object containing the following, where `extras` are channel IDs you might want for logs etc:
```json
{
    token: //Discord bot token,
    apiKey: //osu API key,
    prefix: '`', //Whatever prefix you want
    ...extras
}
```

**4. Start the bot!**
```
$ node index
```

___

## Contributing to BaeBot

**Problems?**

[Create an issue](https://github.com/DMills94/BaeBot/issues)  
[Chat with me on Discord](https://discord.gg/KSKTFNa)  
[Follow me on Twitter](https://twitter.com/ohheyitsbae)  
[Message me on osu!](https://osu.ppy.sh/users/bae-)

I'm open to all feedback and suggestions, don't be afraid. I don't bite! 👿