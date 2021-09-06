// @ts-check

/*
 * An adapter for the gcode viewer allowing information to comes and go from it.
 */

window.addEventListener("message", (event) => {
    const type = event.data.type;

    switch(type) {
        case "START_LOAD_GCODE":
            var options = event.data.options;

            if (options) {
                GCODE.gCodeReader.setOption({
                    filamentDia: options.filamentDiaMm,
                    nozzleDia: options.nozzleDiaMm, 
                    filamentType: options.filamentType, 
                });
            }

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