module.exports = {
    name: "history",
    description: "last 5 recorded messages",
    execute(m, userInput, array) {
        commands = "";
        for (var i = 0; i < array.length; i++) {
            commands += `\n**${i+1}.** ${array[i]}`
        }
        m.channel.send("__Here are the last 5 commands used__\n" + commands);
    }
}
