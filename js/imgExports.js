import { Vector2, Vector3 } from "three";
import { cutPlane, lineData, numPieces, offset } from "./3d.js";
import { getData } from "./graphVis/jsonEditor.js";
import { colorPalette, imgRatio, vbH, vbW } from "./iodtProcessing.js";
import { instantiateCanvases, svgMC, zip } from "./main.js";

export { reduceColors, convertSVGtoImg, warpEnds, calcHeight, downloadImage, setWarpEnds, createLayerSlice, createMoC }

const content = document.querySelector(".content");
// const fileInput = document.querySelector("input[type=file]");

// fileInput.addEventListener("change", previewFile);

// let colorPalette = [[101, 0, 202], [156, 206, 33], [81, 255, 254], [247, 0, 251]]

let warpEnds = 960;
let calcHeight = 650
let slices = 0
// const canvas = document.getElementById("indexColors");
// canvas.width = warpEnds
// canvas.height = calcHeight
// const ctx = canvas.getContext("2d")



// Source - https://stackoverflow.com/a/74026755
// Posted by Teocci, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-10, License - CC BY-SA 4.0

let dataHeader = 'data:image/svg+xml;charset=utf-8'
let $holder = document.getElementById('img-container')
// let $label = document.getElementById('img-format')

const loadImage = async url => {
    const $img = document.createElement('img')
    // const $img = document.getElementById('svgIN')
    $img.src = url
    return new Promise((resolve, reject) => {
        $img.onload = () => resolve($img)
        $img.onerror = reject
    })
}

const serializeAsXML = $e => (new XMLSerializer()).serializeToString($e)

const encodeAsUTF8 = s => `${dataHeader},${encodeURIComponent(s)}`
const encodeAsB64 = s => `${dataHeader};base64,${btoa(s)}`


// Convert SVG to IMG  
const convertSVGtoImg = async e => {
    // const $btn = e.target
    // const format = $btn.dataset.format ?? 'png'
    // $label.textContent = format
    let localSVG = document.getElementById('svg-container').querySelector('svg')
    // let localUVSVG = document.getElementById('svg-container').querySelector('svg')
    // console.log(localSVG)

    const svgURL = encodeAsUTF8(serializeAsXML(localSVG))

    // 0 = min; 1 = max; undefined = use browser default
    const quality = 1
    const format = 'png'
    const dataURL = await getImageURL(svgURL, { format, quality })


    const $img = document.createElement('img')
    $img.src = dataURL
    $img.id = "jpegOut"
    // remove any existing image
    $holder.textContent = ''
    $holder.append($img)

    return 0
}

// Convert SVG to IMG : called from convertSVGtoImg()
const getImageURL = async (svgURL, { format, quality }) => {
    // console.log("getImageIRL")
    const img = await loadImage(svgURL)
    // console.log(img)

    warpEnds = getData("Loom", "TotalWarpEnds", 1)

    calcHeight = (1 / imgRatio) * warpEnds//(img.naturalHeight / img.naturalWidth) * warpEnds

    const imgCanvas = document.getElementById("indexColors");//document.createElement('canvas')

    imgCanvas.width = warpEnds //img.naturalWidth
    imgCanvas.height = calcHeight
    imgCanvas.getContext('2d').drawImage(img, 0, 0, warpEnds, calcHeight)

    console.log(imgCanvas.getContext('2d').getImageData(0, 0, imgCanvas.width, imgCanvas.height))

    return imgCanvas.toDataURL(`image/${format}`, quality)
}


// Reduce Colors: called form proxy in main after convert svg to image
async function reduceColors(imgIn, downloadIn = 1) {
    const canvas = document.getElementById("indexColors");
    let repeats = getData("Loom", "NumberOfRepeats") ? getData("Loom", "NumberOfRepeats") : 1;
    canvas.width = warpEnds * repeats
    canvas.height = calcHeight
    const ctx = canvas.getContext("2d")
    // console.log("reducing colors", canvas.width, canvas.height)
    ctx.drawImage(imgIn, 0, 0, imgIn.width, imgIn.height, 0, 0, warpEnds, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // console.log(imageData)

    let prevColor = []
    for (let i = 0; i < imageData.data.length; i += 4) {
        // for (let i = 0; i < 400; i += 4) {
        let color = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]

        checkForColorMatch:
        for (let j = 0; j < colorPalette.length; j++) {
            if (checkColorMatch(colorPalette[j], color)) {
                imageData.data[i] = color[0]
                imageData.data[i + 1] = color[1]
                imageData.data[i + 2] = color[2]
                imageData.data[i + 3] = 255

                prevColor = color
                break checkForColorMatch;
            }
            if (j == (colorPalette.length - 1)) {
                let assignedColor = mapColorToPalette(color[0], color[1], color[2])
                // console.log(color, " NOT IN palette. NEW COLOR: ", assignedColor)
                if (assignedColor != prevColor) {
                    assignedColor = prevColor
                }
                imageData.data[i] = assignedColor[0]
                imageData.data[i + 1] = assignedColor[1]
                imageData.data[i + 2] = assignedColor[2]
                imageData.data[i + 3] = 255

                prevColor = assignedColor
            }
        }
    }
    let rType = getData("Loom", "TypeOfRepeat")
    let mirroredData
    // if (rType == "mirrored") {
    //     mirroredData = await getMirrored(imageData)
    console.log(imageData)
    // }
    // console.log(imageData, mirroredData)
    for (let i = 0; i < repeats; i++) {
        ctx.putImageData(imageData, i * warpEnds, 0);
        // if (rType == "mirrored" && i % 2 == 1) {
        //     ctx.putImageData(mirroredData, i * warpEnds, 0, 0, 0, warpEnds, calcHeight);
        // } else {
        //     ctx.putImageData(imageData, i * warpEnds, 0, 0, 0, warpEnds, calcHeight);
        // }
    }
    // downloadReduced()
    if (downloadIn) {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob)
            // const img = new Image();
            // img.src = imageUrl;
            downloadImage(imageUrl, "MoB")


            const img = document.createElement('img')
            img.src = imageUrl
            img.id = "jpegOut2"
            // remove any existing image

            // let loc = document.getElementById('finalImage')
            // // loc.textContent = ''
            // loc.append(img)


            // Cleanup: Revoke the object URL when done to free memory
            img.onload = () => URL.revokeObjectURL(imageUrl);
        }, 'image/webp'); // Specify image format (e.g., 'image/jpeg')
    }

    return 0
}

async function getMirrored(imageData) {
    let width = imageData.width
    let mirroredData = new ImageData(width, imageData.height);
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < width; x++) {
            const sourceIndex = (y * width + x) * 4;
            const targetIndex = (y * width + (width - 1 - x)) * 4;

            mirroredData.data[targetIndex] = imageData.data[sourceIndex];
            mirroredData.data[targetIndex + 1] = imageData.data[sourceIndex + 1];
            mirroredData.data[targetIndex + 2] = imageData.data[sourceIndex + 2];
            mirroredData.data[targetIndex + 3] = imageData.data[sourceIndex + 3];
        }
    }
    return mirroredData
}

// function downloadReduced() {

//     canvas.toBlob((blob) => {
//         if (!blob) return;
//         const imageUrl = URL.createObjectURL(blob)
//         // const img = new Image();
//         // img.src = imageUrl;
//         downloadImage(imageUrl)


//         const img = document.createElement('img')
//         img.src = imageUrl
//         img.id = "jpegOut2"
//         // remove any existing image

//         // let loc = document.getElementById('finalImage')
//         // // loc.textContent = ''
//         // loc.append(img)


//         // Cleanup: Revoke the object URL when done to free memory
//         img.onload = () => URL.revokeObjectURL(imageUrl);
//     }, 'image/webp'); // Specify image format (e.g., 'image/jpeg')

// }

// Source - https://stackoverflow.com/a/16095735
// Posted by markE, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-13, License - CC BY-SA 3.0

// use Euclidian distance to find closest color
// send in the rgb of the pixel to be substituted
function mapColorToPalette(red, green, blue) {
    var color, diffR, diffG, diffB, diffDistance, mappedColor;
    var distance = 25000;

    for (var i = 0; i < colorPalette.length; i++) {
        color = colorPalette[i];
        diffR = (color[0] - red);
        diffG = (color[1] - green);
        diffB = (color[2] - blue);
        // console.log(red, color[0], blue, color[1], green, color[2])
        diffDistance = diffR * diffR + diffG * diffG + diffB * diffB;
        if (diffDistance < distance) {
            distance = diffDistance;
            mappedColor = colorPalette[i];
        }
    }
    //TODO do something else here to determine nearest pixel color
    if (mappedColor == null) {
        mappedColor = colorPalette[0];
    }
    return (mappedColor);
}

function checkColorMatch(c1, c2) {
    let i = 0
    // console.log(c1, c2, c1.length, i)
    while (i < c1.length) {
        // console.log(c1[i], c2[i])
        if (c1[i] != c2[i]) {
            return 0
        }
        i++
    }
    return 1
}

// Source - https://stackoverflow.com/a/50300880
// Posted by Ulf Aslak, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-13, License - CC BY-SA 4.0

function downloadImage(urlIN, exportType) {
    var link = document.createElement('a');
    link.download = document.getElementById("file-name-input").value + "_" + exportType + '.png';
    link.href = urlIN //canvas.toDataURL()
    link.click();
}



const buttons = [...document.querySelectorAll('[data-format]')]
for (const $btn of buttons) {
    $btn.onclick = convertSVGtoImg
}

function setWarpEnds(event) {
    console.log(event.target.value)

    warpEnds = event.target.value
    // instantiateCanvases(warpEnds, warpEnds)

    // svgMC.canvas.width = warpEnds

}

async function createLayerSlice(downloadIn = 0) {
    const canvas = document.getElementById("layerSlice");
    canvas.width = vbW + (offset * (numPieces - 1))
    canvas.height = vbH
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let yCP = cutPlane.position.y
    // console.log(yCP, lineData)

    for (let i = 0; i < lineData.length; i++) {
        let pathPoints = []
        // search for two closest points in path (handles non-horizontal line cases)
        let nearestPoint1 = new Vector2(vbW, vbH)
        let nearestPoint2 = new Vector2(vbW, vbH)
        for (let j = 0; j < lineData[i][0].length; j++) {
            let vect = lineData[i][0][j]
            // if (vect.x == 1832) {
            //     console.log(vect)
            //     console.log("Nearest1 CHECK:", Math.abs(vect.y - yCP), Math.abs(nearestPoint1.y - yCP))
            // }
            // console.log(vect.y, yCP)
            if (Math.abs(vect.y - yCP) < Math.abs(nearestPoint1.y - yCP) && ((Math.abs(nearestPoint1.y - yCP) > 5) && (Math.abs(nearestPoint2.x - vect.x) > 15))) {
                // console.log("Nearest1:", vect.y - yCP, nearestPoint1.y - yCP, vect)
                nearestPoint1 = vect
            } else if (Math.abs(vect.y - yCP) < Math.abs(nearestPoint2.y - yCP) && (Math.abs(nearestPoint1.x - vect.x) > 15)) {
                // console.log("Nearest2:", vect, nearestPoint1, (Math.abs(nearestPoint1.x - vect.x) > 15))
                nearestPoint2 = vect
            }
            // if (vect.y >= yCP - 5 && vect.y <= yCP + 5) {
            //     pathPoints.push(vect)
            //     // console.log("At path it: " + i, vect, lineData[i][1])
            // }
        }
        pathPoints.push(nearestPoint1)
        pathPoints.push(nearestPoint2)

        ctx.beginPath(); // Start a new path
        ctx.strokeStyle = 'rgb(' + lineData[i][1].r * 255 + ',' + lineData[i][1].g * 255 + ',' + lineData[i][1].b * 255 + ')'
        // console.log(ctx.strokeStyle, lineData[i][1])
        ctx.lineWidth = 6
        ctx.moveTo(pathPoints[0].x, canvas.height - pathPoints[0].z - 50); // Move the pen to (30, 50)
        ctx.lineTo(pathPoints[1].x, canvas.height - pathPoints[1].z - 50); // Draw a line to (150, 100)
        // console.log(canvas.height, pathPoints[0].x, canvas.height - pathPoints[0].z - 50, pathPoints[1].x, canvas.height - pathPoints[1].z - 50)
        ctx.stroke(); // Render the path

        // console.log(pathPoints)

    }

    if (downloadIn) {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob)
            // const img = new Image();
            // img.src = imageUrl;
            downloadImage(imageUrl, "LayerMap")


            const img = document.createElement('img')
            img.src = imageUrl
            img.id = "layerMapOut"
            // remove any existing image

            // let loc = document.getElementById('finalImage')
            // // loc.textContent = ''
            // loc.append(img)


            // Cleanup: Revoke the object URL when done to free memory
            img.onload = () => URL.revokeObjectURL(imageUrl);
        }, 'image/jpg'); // Specify image format (e.g., 'image/jpeg')
    } else {
        const blobLayerSlice = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create MoC blob"))),
                "image/png"
            );
        });
        // Add PNG to ZIP
        zip.file(document.getElementById("file-name-input").value + "_slice" + slices + ".png", blobLayerSlice);
    }
    slices++
}



async function createMoC(downloadIn = 1) {
    const canvas = document.getElementById("mocout");
    canvas.width = 1275
    canvas.height = 1550
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px Arial";

    ctx.drawImage(svgMC.canvas, 50, 50);
    ctx.fillStyle = "#000"
    let layerMaps = document.getElementById("colorLayerMaps").childNodes
    for (let i = 0; i < layerMaps.length; i++) {
        let mapCanvas = layerMaps[i].childNodes[0]
        let mapLabel = layerMaps[i].childNodes[1]

        ctx.drawImage(mapCanvas, 50, 75 + svgMC.canvas.height + 50 * i);
        ctx.fillText(mapLabel.innerHTML, 100, 100 + svgMC.canvas.height + 50 * i)
    }

    if (downloadIn) {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const imageUrl = URL.createObjectURL(blob)
            downloadInInImage(imageUrl, "MoC")


            const img = document.createElement('img')
            img.src = imageUrl
            img.id = "MoB"

            // Cleanup: Revoke the object URL when done to free memory
            img.onload = () => URL.revokeObjectURL(imageUrl);
        }, 'image/jpg'); // Specify image format (e.g., 'image/jpeg')
    }
    return canvas
}