module.exports = {
  name: "roll",
  description: "Random number between 'x' and 'y'",
  execute(m, args) {

    const Msg = "Command only takes numbers! Try one of:\n```\troll : Random number between 1 and 100\n\troll [maxValue] : Random number between 1 and maxValue\n\troll [minValue] [maxValue] : Random number between minValue and maxValue```";
    const errorMsg = "Incorrect Paramaters. "

    if (args[0] === "help") {
      m.channel.send(Msg);
      return;
    }

    var maxVal = 100;
    var minVal = 1;

    if (args.length === 1) {
      if (/^\+?(0|[1-9]\d*)$/.test(args[0])) {
        maxVal = Math.floor(args[0]) + 1;
        minVal = 1;
      } else {
        m.channel.send(errorMsg + Msg);
        return;
      }
    } else if (args.length > 1) {

      if (/^\+?(0|[1-9]\d*)$/.test(args[0]) && /^\+?(0|[1-9]\d*)$/.test(args[1])) {
        minVal = Math.floor(args[0]);
        maxVal = Math.floor(args[1]) + 1;
      } else {
        m.channel.send(errorMsg + Msg);
        return;
      }
    }

    const rdmNum = Math.floor(Math.random() * (maxVal - minVal) + minVal);
    m.channel.send("You rolled a: " + rdmNum);
  },
};
