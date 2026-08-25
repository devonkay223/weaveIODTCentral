import { colorMapMC, instantiateCanvases, patternPieces, svgMC, writeSVGPath } from "./main.js";
import PatternPiece from "./PatternPiece.js";
import DataDisplay from "./DataDisplay.js";
import { cleanScene, renderSVGAsLines3D } from "./3d.js";
import { setWarpEnds } from "./imgExports.js";
import { getJSON, updatedContent } from "./graphVis/jsonEditor.js";
// import { color } from "three/tsl";

export { colorPalette, extractData, imgRatio, workingJSON, vbW, vbH, parseInputToStandard }

let colorPalette = [];
let colorLayerMap = new Object();
let height = 1000
let imgRatio;
let workingJSON = {}
let vbW
let vbH

let displayData = []

function extractData(SVGdef = '') {
    let iodt = getJSON()
    // console.log(iodt)
    // if (iodt) {
    //     iodt = getJSON()
    // }
    // let iodt = getJSON()
    var keys = Object.keys(iodt.ArtworkAreas);
    const parser = new DOMParser();
    let svgContainer = document.getElementById("svg-container")
    // let svgUVMap = document.getElementById("svg-container-uvmap")

    // json file from CLO contains high lvevl svg element that gets parsed out, but we only need it on the first pass
    // if (iodt.SVG) {
    //     let svgText = iodt.SVG

    //     let pos1 = svgText.search("<svg")
    //     let pos2 = svgText.search("</svg>")
    //     let svgBody = svgText.substring(pos1, pos2 + 6)
    //     var svgConvert = parser.parseFromString(svgBody, "text/html")
    //     var svgHTML = svgConvert.querySelector("svg");
    //     var svgHTMLMod = svgConvert.querySelector("svg");


    //     svgContainer.append(svgHTML)
    //     let size = svgContainer.querySelector("svg").getAttribute("viewBox")
    //     let vals = size.split(" ")
    //     vbW = parseInt(vals[2])
    //     vbH = parseInt(vals[3])

    //     imgRatio = vbW / vbH


    // }
    if (SVGdef) {
        let svgText = SVGdef

        let pos1 = svgText.search("<svg")
        let pos2 = svgText.search("</svg>")
        let svgBody = svgText.substring(pos1, pos2 + 6)
        var svgConvert = parser.parseFromString(svgBody, "text/html")
        var svgHTML = svgConvert.querySelector("svg");
        var svgHTMLMod = svgConvert.querySelector("svg");


        svgContainer.append(svgHTML)
        let size = svgContainer.querySelector("svg").getAttribute("viewBox")
        let vals = size.split(" ")
        vbW = parseInt(vals[2])
        vbH = parseInt(vals[3])

        imgRatio = vbW / vbH
    }


    // let size = svgContainer.querySelector("svg").getAttribute("viewBox")
    // let vals = size.split(" ")
    // vbW = parseInt(vals[2])
    // vbH = parseInt(vals[3])

    // imgRatio = vals[2] / vals[3]

    // instantiateCanvases(vals[2], vals[3])
    instantiateCanvases(vbW, vbH)
    cleanScene()

    colorLayerMap = new Object();
    for (var i = 0; i < keys.length; i++) {
        let np;
        // patternPieces = []
        colorPalette.push(hexToRgb(iodt.ArtworkAreas[keys[i]].Color))
        // console.log(colorPalette)
        colorLayerMap[iodt.ArtworkAreas[keys[i]].Color] = iodt.ArtworkAreas[keys[i]].LayerSystem
        if (iodt.ArtworkAreas[keys[i]].SVG) {
            let path = iodt.ArtworkAreas[keys[i]].SVG
            var pathConvert = parser.parseFromString(path, "text/html")
            var pathHTML = pathConvert.querySelector("path");
            let d = pathHTML.getAttribute("d")
            // svgContainer.appendChild(pathHTML)
            np = new PatternPiece(keys[i], d, iodt.ArtworkAreas[keys[i]].Color, iodt.ArtworkAreas[keys[i]].LayerSystem, iodt.ArtworkAreas[keys[i]].ID)
            patternPieces.push(np)
            writeSVGPath(pathHTML, iodt.ArtworkAreas[keys[i]].Color)
            for (let j = 0; j < np.layersCount; j++) {
                // writeSVGPath(pathHTML, j)
                renderSVGAsLines3D(pathHTML.getAttribute("d"), np.color, j, (np.layersCount - j) * 20)//i * 75) //, keys[i] + "_" + j)
                // if (j > 0) {
                //     // let svgUVMapSVG = document.getElementById("svg-container-uvmap").querySelector("svg")
                //     // pathHTML.setAttribute("transform", "translate(0 " + j * height + ")")
                //     pathHTML.setAttribute("transform", "translate(0 " + j + ")")
                //     svgHTMLMod.appendChild(pathHTML)
                //     // // console.log(pathHTML, j)
                // }
            }
        }
        // if (iodt.Pattern[keys[i]].SeamLinePairs) {
        //     // // console.log("seamlines")
        //     parseSewing(np, iodt, iodt.Pattern[keys[i]].SeamLinePairs)
        // }

    }
    // svgHTML.setAttribute("viewBox", "0 0 3000 8000")
    writeOutLayerMapDiv()
}


// 
function parseInputToStandard(iodtIn) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', '/js/dataDef.json', false);
    xobj.send(null);
    console.log(xobj.responseText)
    var dataDef = JSON.parse(xobj.responseText);
    console.log(dataDef)
    var keysDataDef = Object.keys(dataDef);


    for (let i = 0; i < keysDataDef.length; i++) {
        // console.log(keysDataDef[i])
        if (iodtIn[keysDataDef[i]]) {
            // console.log(iodtIn[keysDataDef[i]])
            // workingJSON[keysDataDef[i]] = iodtIn[keysDataDef[i]]
            workingJSON[keysDataDef[i]] = {}
            parseInputSubObject(iodtIn[keysDataDef[i]], dataDef[keysDataDef[i]], workingJSON[keysDataDef[i]])
        } else {
            workingJSON[keysDataDef[i]] = dataDef[keysDataDef[i]]
        }
    }
    // console.log(workingJSON)
    updatedContent();
}

// function exportJSONFile() {

// }


//calling to set the editor json content (insted of default text setting --> can't take json in initially, might be user error or editor bug)
function parseInputSubObject(content, standard, workingLoc) {
    // console.log(content, standard, isArray(standard), isArray(content))

    //TODO does not properly parse subentries that are arrays --> either chnage point list to dict or figure out. Also change standardkeys below to be i instead of 0 <-- this is a hack that makes arrays work 
    // console.log(content === Array)
    if (typeof content === "object") {
        var keysContent = Object.keys(content);
    }
    if (typeof standard === "object") {
        var keysStandard = Object.keys(standard);
        // console.log(keysStandard)

        for (let i = 0; i < keysContent.length; i++) {
            if (isArray(content)) {
                parseInputSubObject(content[keysContent[i]], standard, workingLoc[keysContent[i]])
            }
            if (typeof (standard[keysStandard[i]]) === 'object' && content[keysContent[i]]) {
                //CASE: standard has an object entry
                workingLoc[keysContent[i]] = {}
                // console.log("1", keysStandard[i], keysContent[i])

                parseInputSubObject(content[keysContent[i]], standard[keysStandard[0]], workingLoc[keysContent[i]])



            } else if (typeof (content[keysContent[i]]) === "object") {
                //CASE: handles multiple entries after the first one 
                workingLoc[keysContent[i]] = {}
                // console.log("2", keysStandard[i], keysContent[i])
                parseInputSubObject(content[keysContent[i]], standard[keysStandard[0]], workingLoc[keysContent[i]])
            }
            else {
                //CASE: entry is a value 
                // console.log("3", keysStandard[i], keysContent[i])
                workingLoc[keysContent[i]] = content[keysContent[i]]
            }
        }
    } else {

        for (let i = 0; i < keysContent.length; i++) {
            // console.log("4", keysContent[i])
            workingLoc[keysContent[i]] = content[keysContent[i]]
        }
    }

}

function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
}

// function writeToJSONview(iodtIn) {
//     var xobj = new XMLHttpRequest();
//     xobj.overrideMimeType("application/json");
//     xobj.open('GET', '/js/dataDef.json', false);
//     xobj.send(null);
//     // // console.log(xobj.responseText)
//     var dataDef = JSON.parse(xobj.responseText);
//     var keysDataDef = Object.keys(dataDef);
//     // console.log(dataDef)

//     let rContent = document.getElementById("rightContent");

//     for (let i = 0; i < keysDataDef.length; i++) {
//         let newDataCat = new DataDisplay(keysDataDef[i], dataDef[keysDataDef[i]], iodtIn[keysDataDef[i]]) //content)
//         displayData.push(newDataCat)
//     }

//     // addIODTListeners()
// }

// function addIODTListeners() {
//     document.getElementById("Loom_TotalWarpEnds_0").addEventListener("change", setWarpEnds);

//     // const entries = document.querySelectorAll('.box');

//     // boxes.forEach(box => {
//     //   box.addEventListener('click', function handleClick(event) {
//     //     console.log('box clicked', event);

//     //     box.setAttribute('style', 'background-color: yellow;');
//     //   });
//     // });


//     // dropdownListeners()
// }


// not in use? 
// function dropdownListeners() {
//     let dropDowns = document.getElementsByClassName("dataEntryMappings")
//     console.log(dropDowns)

//     for (let i = 0; i < dropDowns.length; i++) {
//         let dd = dropDowns[i]
//         // console.log(document.getElementById(dd.id))
//         let type = dd.id.split("_")[1]
//         document.getElementById(dd.id).addEventListener("focus", () => {
//             console.log("Input")
//             // const query = dd.value.toLowerCase();

//             // Clear existing options
//             // datalist.replaceChildren();

//             // if (!query) return;

//             // Find matching items
//             let items = []
//             // console.log(displayData)
//             for (let i = 0; i < displayData.length; i++) {
//                 let d = displayData[i]
//                 console.log(d.type, type)
//                 if (String(d.type) == type) {
//                     items = d.entries
//                 }
//             }


//             // console.log(items, datalist)
//             // const matches = items.filter(item =>
//             //     item.toLowerCase().includes(query)
//             // );

//             // Add matches to the datalist
//             items.forEach(item => {
//                 const option = document.createElement("option");
//                 option.value = item;
//                 option.innerHTML = item
//                 dd.appendChild(option);
//             });
//         });
//     }
// }


// Source - https://stackoverflow.com/a/5624139
// Posted by Tim Down, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-22, License - CC BY-SA 4.0

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    // return result ? {
    //     r: parseInt(result[1], 16),
    //     g: parseInt(result[2], 16),
    //     b: parseInt(result[3], 16)
    // } : null;
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

// alert(hexToRgb("#0033ff").g); // "51";



// function parseSewing(patternIn, data, smlp) {
//     // TODO find macthed edges?? --> in theory the two pieces touch in the svg.... so just figure out shared edges?? 
//     // 
//     for (let j = 0; j < smlp.length; j++) {
//         let p1 = smlp[j][0]
//         let p2 = smlp[j][1]
//         let l1 = data.NamesMap[p1]
//         let l2 = data.NamesMap[p2]
//         // // console.log(p1, p2)
//         let p2mapped = getPatternMapped(p2, data.NamesMap, data.PatternMap, data)

//         patternIn.addSeam(l1, p2mapped, l2)
//     }
// }

// function getPatternMapped(pIn, NamesMap, PatternMap, data) {
//     // // console.log(pIn, NamesMap[pIn])
//     if (data.Pattern[NamesMap[pIn]] != undefined) {
//         // // console.log("macthed: ", NamesMap[pIn])
//         return NamesMap[pIn]
//     } else {
//         return getPatternMapped(PatternMap[pIn], NamesMap, PatternMap, data)
//     }

// }

//maybe this doesn't go in here? 
function writeOutLayerMap() {
    var keys = Object.keys(colorLayerMap);
    let ctx = colorMapMC.ctx
    let x = 0;
    let y = 0;

    for (var i = 0; i < keys.length; i++) {
        let color = keys[i]
        // console.log(color)
        ctx.font = "50px Arial";
        ctx.beginPath()
        ctx.rect(x, y, 50, 50)
        ctx.fillStyle = color
        ctx.fill()
        ctx.fillText(colorLayerMap[keys[i]], x, y + 50);
        x += 200
    }
}

function writeOutLayerMapDiv() {
    // console.log("CLM", colorLayerMap)

    let divLoc = document.getElementById("colorLayerMaps")
    if (divLoc.hasChildNodes()) {
        divLoc.replaceChildren()
    }
    // // console.log(svgMC.xTop)
    divLoc.style.left = svgMC.xTop + "px";
    divLoc.style.top = svgMC.yTop + svgMC.canvas.height + 30 + "px";
    let keys = Object.keys(colorLayerMap);
    let x = 0;
    let y = 0;

    for (var i = 0; i < keys.length; i++) {
        var newDiv = document.createElement('div');
        newDiv.class = "mapBlocks"
        // newDiv.setAttribute("class", "colorMapBlocks") //CHANGE TO pairblocks if you want them stacked
        var canvas = document.createElement('canvas');
        canvas.width = 50
        canvas.height = 50
        var ctx = canvas.getContext("2d");
        let color = keys[i]

        canvas.id = "map-" + color;
        canvas.class = "layerMaps"
        newDiv.appendChild(canvas);

        // // console.log(color)
        let size = 30
        ctx.font = size + "px Arial";
        ctx.beginPath()
        ctx.rect(x, y, size, size)
        ctx.fillStyle = color
        ctx.fill()
        // ctx.fillText(colorLayerMap[keys[i]], x + 80, y + 40); //TODO do you want to make these divs w canvas and text??
        let text = document.createElement("p")
        text.style.color = color
        text.textContent = colorLayerMap[keys[i]]
        newDiv.appendChild(text)
        divLoc.appendChild(newDiv)
    }
}

