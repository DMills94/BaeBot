module.exports = {
    name: "eval",
    description: "returns what you type in log form",
    execute(m, args) {
        joinedArgs = args.join(" ");
        console.log('[PASSED ARGS]: ' + joinedArgs);

        console.log('[EVAL RESULT]`v`: ' + eval(joinedArgs));



        // m.channel.send(loggedValue)
        //     .catch(err => {
        //         m.channel.send(err);
        //     })

    }
}
