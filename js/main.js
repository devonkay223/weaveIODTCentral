// imports here
import { addCutPlane, addPlane, addSVGGeometry, instatiate3D, movePlaneDown, movePlaneUp, renderSVGAsLines3D } from "./3d.js";
import { renderData } from "./graphVis/dependencyGraph.js";
import { downloadIODT, instantiateEditor } from "./graphVis/jsonEditor.js";
import { extractData, parseInputToStandard } from "./iodtProcessing.js";
import MainCanvas from "./MainCanvas.js";
import { convertSVGtoImg, reduceColors, downloadImage, setWarpEnds, createLayerSlice, createMoC } from "./imgExports.js";
// import { reduceColors } from "./svgtojpg.js";
export { svgMC, dGraphMC, colorMapMC, writeSVGPath, patternPieces, instantiateCanvases }
// vars here
let toolbarH = 100; // UPDATE IN CSS if you change
let svgPaths = []

let numLayers = 3;
let svgUploaded = 0;
let patternPieces = []

let svgMC;
let colorMapMC;
let dGraphMC;
// instatiate canvases here 
// let svgMC = new MainCanvas("svg", 0, (window.innerWidth / 2) + 50, toolbarH + 50, 1500, 1000)
// let colorMapMC = new MainCanvas("colorMap", 0, (window.innerWidth / 2) + 50, toolbarH + 50 + 960, window.innerWidth / 2, 100)


// ______ PAGE SETUP______

window.onload = function () {
    // initialize canvases  
    instatiate3D()
    instantiateEditor()

    // dGraphMC = new MainCanvas("dGraph", 0, window.innerWidth / 2, window.innerHeight / 2, window.innerWidth, window.innerHeight / 2)
    // dGraphMC.background()

}


// _______ INTERFACE _________
// button event listeners
// warpMC.canvas.addEventListener("click", warp_Click)
// const fileInput = document.querySelector("input[type=file]");
const svgInput = document.getElementById("svg-upload")
svgInput.addEventListener("change", previewSVG);
const iodtInput = document.getElementById("iodt-upload").addEventListener("change", loadIODT); // TODO can this just be called direct in the onclick? 
document.getElementById("iodt-upload-button").addEventListener("click", iodtUploadClick)
// document.getElementById("svg-upload-button").addEventListener("click", svgUploadClick)
// document.getElementById("svg-to-jpg-button").addEventListener("click", convertSVGtoImg)
document.getElementById("jpg-reduce-colors-button").addEventListener("click", reduceColorsProxy)
document.getElementById("moc-button").addEventListener("click", createMoC)

document.getElementById("iodt-download-button").addEventListener("click", downloadIODT)

document.getElementById("cut-plane-button").addEventListener("click", addCutPlane)
document.getElementById("move-up-button").addEventListener("click", movePlaneUp)
document.getElementById("move-down-button").addEventListener("click", movePlaneDown)
document.getElementById("capture-slice-button").addEventListener("click", createLayerSlice)




function doc_keyUp(e) {
    // if (e.key == 'q') {
    //     // reduceColors(document.getElementById("jpegOut"))
    //     createLayerSlice()
    // }
    // if (e.key == 'w') {
    //     addCutPlane()
    // }
    // if (e.key == 't') {
    //     movePlaneUp()
    // }
    // if (e.key == 'g') {
    //     movePlaneDown()
    // }

    if (e.key == 'p') {
        createMoC();
    }

}

// register the handler 
document.addEventListener('keyup', doc_keyUp);



function previewSVG() {
    const file = svgInput.files[0]; //this is going to be a problem if you upload the files in the wrong order
    const reader = new FileReader();
    // const parser = new DOMParser();


    reader.addEventListener("load", () => {
        // this will then display a text file
        let svgText = reader.result;

        // content.innerText = svgText

        let pos1 = svgText.search("<svg")
        let pos2 = svgText.search("</svg>")
        let svgBody = svgText.substring(pos1, pos2 + 6)

        // console.log(svgBody)
        // console.log(svgBody)
        const parser = new DOMParser();
        // console.log(svgBodyIn)

        // writes offscreen svg
        let svgContainer = document.getElementById("svg-container")
        var svgConvert = parser.parseFromString(svgBody, "text/html")
        var svgHTML = svgConvert.querySelector("svg");
        // console.log(svgHTML)
        // renderSVGAsLines3D()

        svgContainer.append(svgHTML)

        let size = svgContainer.querySelector("svg").getAttribute("viewBox")
        let vals = size.split(" ")

        // console.log(vals)
        instantiateCanvases(vals[2], vals[3])


        // draws offscreen svg to svg editing canvas 


        writeSVGPaths()

        // // writes offscreen svg
        // let svgContainer = document.getElementById("svg-container")
        // var svgConvert = parser.parseFromString(svgBody, "text/html")
        // var svgHTML = svgConvert.querySelector("svg");
        // console.log(svgHTML)
        // // renderSVGAsLines3D()

        // svgContainer.append(svgHTML)


        // // draws offscreen svg to svg editing canvas 
        // let paths = document.getElementById("svg-container").querySelectorAll("path")
        // paths.forEach((path => {
        //     // console.log(path)
        //     // renderSVGAsLines3D(path)
        //     let newPath = new Path2D(path.getAttribute("d"))
        //     renderSVGAsLines3D(path.getAttribute("d"), window.getComputedStyle(path).fill)
        //     svgPaths.push(newPath)

        //     // svgMC.ctx.strokeStyle = '#000';
        //     // svgMC.ctx.lineWidth = 1;
        //     svgMC.ctx.fillStyle = window.getComputedStyle(path).fill
        //     svgMC.ctx.fill(newPath)
        // }))


        // addPlane(numLayers);
        // addSVGGeometry()

    });

    if (file) {
        reader.readAsText(file);
    }

}

function instantiateCanvases(width, height) {

    // let scaledH = ((window.innerHeight / 2) * .8)
    // let scaledW = (scaledH / height) * width
    // svgMC = new MainCanvas("svg", 0, ((window.innerWidth / 2) - scaledW) / 2, 0, scaledW, scaledH)
    let scaledW = ((window.innerWidth / 2) * .75)
    let scaledH = (scaledW / width) * height
    svgMC = new MainCanvas("svg", 0, ((window.innerWidth / 2) - scaledW) / 2, 0, scaledW, scaledH)
    svgMC.ctx.translate(0, scaledH);
    // Scale vertically (mirror Y-axis)  
    svgMC.ctx.scale(1, -1);
    svgMC.ctx.scale(scaledW / width, scaledH / height)

    svgMC.background()

}

function writeSVGPaths() {
    let paths = document.getElementById("svg-container").querySelectorAll("path")

    paths.forEach((path => {
        writeSVGPath(path)
    }))

}

function writeSVGPath(path, colorIn = 0) {
    let color = colorIn
    let newPath = new Path2D(path.getAttribute("d"))
    // if (path.getAttribute("fill")) {
    //     color = path.getAttribute("fill")
    // } else {
    //     color = window.getComputedStyle(path).fill
    // }
    // renderSVGAsLines3D(path.getAttribute("d"), color, layerIn)
    svgPaths.push(newPath)

    // ctx.translate(drawX, verticalFlipY + imgHeight);
    // // Scale vertically (mirror Y-axis)  
    // ctx.scale(1, -1);

    // svgMC.ctx.strokeStyle = '#000';
    // svgMC.ctx.lineWidth = 1;
    svgMC.ctx.fillStyle = color
    // console.log(newPath, color)
    svgMC.ctx.fill(newPath)
}

function loadIODT() {
    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(event.target.files[0]);
    document.getElementById("file-name-input").value = event.target.files[0].name.split(".json")[0]
    // console.log(event.target.files[0].name)
}

async function onReaderLoad(event) {
    let iodt = JSON.parse(event.target.result);
    // writeToJSONview(iodt)
    // console.log(event.target.result);
    // iodt = JSON.parse(event.target.result);
    // console.log(obj)
    // alert_data(obj.name, obj.family);
    await parseInputToStandard(iodt)

    extractData(iodt.SVG)
    // renderData() graph vis 
}

// proxy click for file upload on html input calls loadIODT
function iodtUploadClick() {
    document.getElementById('iodt-upload').click();
}

function svgUploadClick() {
    document.getElementById('svg-upload').click();
}

async function reduceColorsProxy() {
    await convertSVGtoImg()
    reduceColors(document.getElementById("jpegOut"))
}

function downloadZip() { }



// function buttonCollapse() {
//     var coll = document.getElementsByClassName("collapsible");
//     var i;

//     for (i = 0; i < coll.length; i++) {
//         coll[i].addEventListener("click", function () {
//             this.classList.toggle("active");
//             var content = this.nextElementSibling;
//             if (content.style.display === "block") {
//                 content.style.display = "none";
//             } else {
//                 content.style.display = "block";
//             }
//         });
//     }
// }



