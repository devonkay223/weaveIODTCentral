export default class PatternPiece {
    constructor(nameIn, pathIn, colorIn, layerSystemIn, idIn) {
        this.path = pathIn
        this.layerSys = layerSystemIn
        this.layersCount = this.parseNumLayers(layerSystemIn)
        this.color = colorIn
        this.name = nameIn
        this.id = idIn
        this.seamlinePairs = []
    }

    writeSVGPath(path, layerIn = 0) {
        let color
        let newPath = new Path2D(path.getAttribute("d"))

        if (path.getAttribute("fill")) {
            color = path.getAttribute("fill")
        } else {
            color = window.getComputedStyle(path).fill
        }
        renderSVGAsLines3D(path.getAttribute("d"), color, layerIn)
        svgPaths.push(newPath)

        // svgMC.ctx.strokeStyle = '#000';
        // svgMC.ctx.lineWidth = 1;
        svgMC.ctx.fillStyle = color
        svgMC.ctx.fill(newPath)
    }

    addSeam(layerFrom, patternTo, layerTo) {
        // console.log(layerFrom, patternTo, layerTo)
        this.seamlinePairs.push([layerFrom, patternTo, layerTo])
    }

    parseNumLayers(stringIn) {
        var count = (stringIn.match(/\(/g) || []).length;
        // console.log(count)
        return count
    }

    checkForMatchedSides(patternTo) {
        let svg1 = this.path
        let svg2 = patternTo.path
        // <path d='M 1303.0,-734.5 C 1097.0,-527.5 1303.0,0.0 1303.0,0.0  L 510.0,0.0  C 510.0,0.0 745.0,-527.5 510.0,-734.5  C 274.5,-941.5 381.5,-1312.5 381.5,-1312.5  L 1415.5,-1312.5  C 1415.5,-1312.5 1509.5,-941.5 1303.0,-734.5 ' fill='#51ffff'/>",
        // <path d='M 504.5,-734.5 C 740.0,-527.5 504.5,0.0 504.5,0.0  L 0.0,0.0  L 0.0,-1312.5  L 376.5,-1312.5  C 376.5,-1312.5 269.5,-941.5 504.5,-734.5 ' fill='#3eff58'/>",


    }

    parseSvgPath() {
        let d = this.path
        let i = 0;
        let cmd = "";

        let x = 0, y = 0;
        let startX = 0, startY = 0;

        let lastCX = 0, lastCY = 0;

        const curves = [];

        function num() {
            return parseFloat(tokens[i++]);
        }

        while (i < tokens.length) {

            if (/[a-zA-Z]/.test(tokens[i])) {
                // console.log(tokens[i])
                cmd = tokens[i++];
            }
            // console.log(cmd)
            switch (cmd) {


                case "M":
                    x = num();
                    y = num();
                    startX = x;
                    startY = y;
                    cmd = "L";
                    break;

                case "m":
                    x += num();
                    y += num();
                    startX = x;
                    startY = y;
                    cmd = "l";
                    break;

                case "L":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const nx = num();
                        const ny = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [nx, ny]
                        });

                        x = nx;
                        y = ny;
                    }
                    break;

                case "l":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const dx = num();
                        const dy = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [x + dx, y + dy]
                        });

                        x += dx;
                        y += dy;
                    }
                    break;

                case "H":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const nx = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [nx, y]
                        });

                        x = nx;
                    }
                    break;

                case "h":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const dx = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [x + dx, y]
                        });

                        x += dx;
                    }
                    break;

                case "V":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const ny = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [x, ny]
                        });

                        y = ny;
                    }
                    break;

                case "v":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
                        const dy = num();

                        curves.push({
                            type: "line",
                            start: [x, y],
                            end: [x, y + dy]
                        });

                        y += dy;
                    }
                    break;

                case "C":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {

                        const x1 = num();
                        const y1 = num();
                        const x2 = num();
                        const y2 = num();
                        const x3 = num();
                        const y3 = num();

                        curves.push({
                            type: "cubic",
                            start: [x, y],
                            c1: [x1, y1],
                            c2: [x2, y2],
                            end: [x3, y3]
                        });

                        lastCX = x2;
                        lastCY = y2;

                        x = x3;
                        y = y3;
                    }
                    break;

                case "c":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {

                        const x1 = x + num();
                        const y1 = y + num();
                        const x2 = x + num();
                        const y2 = y + num();
                        const x3 = x + num();
                        const y3 = y + num();

                        curves.push({
                            type: "cubic",
                            start: [x, y],
                            c1: [x1, y1],
                            c2: [x2, y2],
                            end: [x3, y3]
                        });

                        lastCX = x2;
                        lastCY = y2;

                        x = x3;
                        y = y3;
                    }
                    break;

                case "S":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {

                        const c1x = 2 * x - lastCX;
                        const c1y = 2 * y - lastCY;

                        const c2x = num();
                        const c2y = num();
                        const ex = num();
                        const ey = num();

                        curves.push({
                            type: "cubic",
                            start: [x, y],
                            c1: [c1x, c1y],
                            c2: [c2x, c2y],
                            end: [ex, ey]
                        });

                        lastCX = c2x;
                        lastCY = c2y;

                        x = ex;
                        y = ey;
                    }
                    break;

                case "s":
                    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {

                        const c1x = 2 * x - lastCX;
                        const c1y = 2 * y - lastCY;

                        const c2x = x + num();
                        const c2y = y + num();
                        const ex = x + num();
                        const ey = y + num();

                        curves.push({
                            type: "cubic",
                            start: [x, y],
                            c1: [c1x, c1y],
                            c2: [c2x, c2y],
                            end: [ex, ey]
                        });

                        lastCX = c2x;
                        lastCY = c2y;

                        x = ex;
                        y = ey;
                    }
                    break;

                case "Z":
                case "z":
                    curves.push({
                        type: "line",
                        start: [x, y],
                        end: [startX, startY]
                    });

                    x = startX;
                    y = startY;
                    break;

                case "a":
                    i++
                    break;

                default:
                    // console.log(`Unsupported SVG command: ${cmd}`)
                    throw new Error(`Unsupported SVG command: ${cmd}`);
            }
        }

        // console.log(curves)
        return curves;
    }
}