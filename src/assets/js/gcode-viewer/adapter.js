// @ts-check

/*
 * An adapter for the gcode viewer allowing information to comes and go from it.
 */

window.addEventListener("message", (event) => {
    console.log("Received Message!");
    console.log(event);

    const type = event.data.type;

    switch(type) {
        case "START_LOAD_GCODE":
            GCODE.gCodeReader.loadFile(event.data.gcode);
           break;
    }
})

GCODE.adapter = (function() {
    return {
        sendMessageToLog: (action) => {
            window.parent.postMessage(action);
        }
    }
})();

GCODE.adapter.sendMessageToLog({
    type: "GCODE_PARSER_INIT"
})