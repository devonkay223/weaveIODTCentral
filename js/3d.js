import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { plane } from 'three/examples/jsm/Addons.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'; // 'three/examples/jsm/loaders/SVGLoader.js'//'
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three.meshline';

import { svgMC } from './main';
import { calcHeight, warpEnds } from './imgExports';
import { vbH, vbW } from './iodtProcessing';

// const MeshLine = require('three.meshline').MeshLine;
// const MeshLineMaterial = require('three.meshline').MeshLineMaterial;
// const MeshLineRaycast = require('three.meshline').MeshLineRaycast;


export { instatiate3D, addPlane, addSVGGeometry, cleanScene, renderSVGAsLines3D, addCutPlane, movePlaneUp, movePlaneDown, lineData, cutPlane, offset, numPieces }

let scene;
let camera;
let controls;
let loader;
let renderer;

let allVect3 = []
let pathIndex = 0
let offset = 75 //used as magic number in iodt processing 
let numPieces
let cutPlane;
let lineData = []
let pointsSampleSize = 50

// var resolution = new THREE.Vector2(window.innerWidth / 2, window.innerHeight);
var resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

let colors = []


function instatiate3D() {

    scene = new THREE.Scene();
    // camera = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 5000);
    camera = new THREE.PerspectiveCamera(75, (window.innerWidth) / window.innerHeight, 0.1, 5000);


    var axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    renderer = new THREE.WebGLRenderer({ alpha: true });
    // renderer.setSize(window.innerWidth / 2, window.innerHeight);
    renderer.setSize(window.innerWidth / 2, (window.innerHeight - 100) / 2);

    renderer.setAnimationLoop(animate);
    document.getElementById("rendercanvas").appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(warpEnds, 0, warpEnds);
    // camera.lookAt(new THREE.Vector3(warpEnds, warpEnds, warpEnds));
    controls.target = new THREE.Vector3(warpEnds / 2, warpEnds / 2, 0);




    function animate(time) {
        renderer.render(scene, camera);
        // // console.log(camera.position)
    }
}


//UNUSED
// from https://muffinman.io/blog/three-js-extrude-svg-path/
function addSVGGeometry() {
    const svg = document.getElementById("svg-container").querySelectorAll("svg")//document.querySelector('svg')//.outerHTML;

    const paths = document.getElementById("svg-container").querySelectorAll("path") // document.querySelector('svg')//.outerHTML;
    // console.log(paths)

    loader = new SVGLoader(); //new THREE.SVGLoader();
    const svgPath = new SVGLoader().parse(svg)
    // const svgData = loader.parse(svgMarkup);
    // // console.log(svgData)
    // // console.log(svgData.paths)

    // Group that will csontain all of our paths
    const svgGroup = new THREE.Group();

    const material = new THREE.MeshNormalMaterial();

    // // console.log(svgMarkup)
    // Loop through all of the parsed paths
    // svgData.paths.
    // svgMarkup.forEach((path, i) => {
    //     // console.log(path)
    //     const shapes = SVGLoader.createShapes(path);

    //     // Each path has array of shapes
    //     shapes.forEach((shape, j) => {
    //         // Finally we can take each shape and extrude it
    //         const geometry = new THREE.ExtrudeGeometry(shape, {
    //             depth: 20,
    //             bevelEnabled: false
    //         });

    //         // Create a mesh and add it to the group
    //         const mesh = new THREE.Mesh(geometry, material);

    //         svgGroup.add(mesh);
    //     });
    // });
    // // console.log(paths)
    // let testsvg = '<svg class="svg-inline--fa fa-upload" data-prefix="fas" data-icon="upload" role="img" viewBox="0 0 448 512" aria-hidden="true" data-fa-i2svg=""><path fill="red" d="M256 109.3L256 320c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-210.7-41.4 41.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l96-96c12.5-12.5 32.8-12.5 45.3 0l96 96c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 109.3zM224 400c44.2 0 80-35.8 80-80l80 0c35.3 0 64 28.7 64 64l0 32c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64l0-32c0-35.3 28.7-64 64-64l80 0c0 44.2 35.8 80 80 80zm144 24a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"></path></svg>'

    // let svgData = loader.parse(svg[0])
    // // console.log(THREE.REVISION);

    // // console.log(svgData)
    const group = new THREE.Group();
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        path.removeAttribute("class")
        // let testpath = "<path d='m299,666.5H0V0h103.5s.5,226,97.5,308c115.5,98.5,98,358.5,98,358.5'>"
        const parser = new DOMParser();
        // Parse the HTML string
        const doc = parser.parseFromString(path, 'text/html');
        // // console.log(testpath)
        const shapes = SVGLoader.createShapes(path);
        // const shape = path.toShapes(false)
        // const shape = new THREE.ShapePath(path)
        const material = new THREE.MeshBasicMaterial({
            color: path.color,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        // const parsedShapes = SVGLoader.parse(path)
        // const shapes = SVGLoader.createShapes(parsedShapes);
        for (let j = 0; j < shapes.length; j++) {
            const shape = shapes[j];
            const geometry = new THREE.ShapeGeometry(shape);
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
        }
    }

    // Add our group to the scene (you'll need to create a scene)
    scene.add(group);
}

// not used
function addPlane(layersIn) {

    for (let i = 0; i < layersIn; i++) {
        const geometry = new THREE.PlaneGeometry(warpEnds, calcHeight);
        const texture = new THREE.CanvasTexture(svgMC.canvas) //ctx.canvas);

        const material = new ({
            map: texture,
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 180 * 90
        // plane.rotation.z = -45
        plane.position.y = i * 1.5

        scene.add(plane);
    }

    renderer.render(scene, camera);


}

function cleanScene() {
    // console.log("CLEANING")
    var to_remove = [];

    scene.traverse(function (child) {
        // console.log(child)
        if (child instanceof THREE.Mesh) {
            to_remove.push(child);
        }
    });

    for (var i = 0; i < to_remove.length; i++) {
        scene.remove(to_remove[i]);
    }
    cutPlane = null
}



//  _______LAYERS DIAGRAM FUNCTIONS______

// adds intersection plane to 3d view that creates the layer slice position
function addCutPlane() {
    if (!cutPlane) {
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        let width = vbW + (offset * (numPieces - 1))
        let height = 3 * 50
        const geometry = new THREE.PlaneGeometry(width + offset, height + 50);
        // console.log(vbW, vbH, offset, numPieces)
        // const texture = new THREE.CanvasTexture(svgMC.canvas) //ctx.canvas);

        // const material = new THREE.MeshBasicMaterial({
        //     map: texture,
        // });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 180 * 90
        // plane.rotation.z = -45
        plane.position.x = width / 2
        plane.position.z = height / 2

        cutPlane = plane

        scene.add(plane);

        renderer.render(scene, camera);
    }


}

function movePlaneUp() {
    if (cutPlane) {
        cutPlane.position.y += 10
    }
}

function movePlaneDown() {
    if (cutPlane) {
        cutPlane.position.y -= 10
    }
}




// _________ RENDER LINES AS 3D_________

// function called on single path from svg to render in 3D
function renderSVGAsLines3D(pathIn, colorIn, layerIn = 0, Offset = 0) {
    let linesDataOut = parseSvgPath(pathIn)
    var keys = Object.keys(linesDataOut);
    var materialML = new MeshLineMaterial({
        map: null,
        useMap: false,
        color: new THREE.Color(colors[colors.length]),
        opacity: 1,
        resolution: resolution,
        sizeAttenuation: false,
        lineWidth: 25,
        depthWrite: false,
        depthTest: false,
        transparent: true
    });
    materialML.color = new THREE.Color(colorIn);
    let z = layerIn * 50;

    numPieces = keys.length

    let pathPoints = []
    for (var i = 0; i < keys.length; i++) {
        let points = []
        if (linesDataOut[keys[i]].type == "line") {
            // // console.log(linesDataOut[i])
            // points = addLine(linesDataOut[keys[i]].start[0] + xOffset, linesDataOut[keys[i]].start[1], linesDataOut[keys[i]].end[0] + xOffset, linesDataOut[keys[i]].end[1], z, materialML)

            points = addLine(linesDataOut[keys[i]].start[0], linesDataOut[keys[i]].start[1], linesDataOut[keys[i]].end[0], linesDataOut[keys[i]].end[1], z + (Offset), materialML)
        }
        if (linesDataOut[keys[i]].type == "cubic") {
            // // console.log(linesDataOut[i])
            // points = addBezier(linesDataOut[keys[i]].start[0] + xOffset, linesDataOut[keys[i]].start[1], linesDataOut[keys[i]].c1[0] + xOffset, linesDataOut[keys[i]].c1[1], linesDataOut[keys[i]].c2[0] + xOffset, linesDataOut[keys[i]].c2[1], linesDataOut[keys[i]].end[0] + xOffset, linesDataOut[keys[i]].end[1], z, materialML)

            points = addBezier(linesDataOut[keys[i]].start[0], linesDataOut[keys[i]].start[1], linesDataOut[keys[i]].c1[0], linesDataOut[keys[i]].c1[1], linesDataOut[keys[i]].c2[0], linesDataOut[keys[i]].c2[1], linesDataOut[keys[i]].end[0], linesDataOut[keys[i]].end[1], z + (Offset), materialML)
        }
        if (points) {
            // console.log(points)
            pathPoints.push(...points)
        }
    }
    // push points to lineData - used to create layer slice diagrams 
    lineData.push([pathPoints, materialML.color])
    // console.log(lineData)
    // pathIndex++

    // vect3RenderDEBUG()
}

function vect3RenderDEBUG() {
    for (let vect in allVect3) {
        const dotGeometry = new THREE.BufferGeometry();
        dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVect3[vect]), 3));
        const dotMaterial = new THREE.PointsMaterial({ size: 20, color: 0x0000ff });
        const dot = new THREE.Points(dotGeometry, dotMaterial);
        scene.add(dot);
    }
}

// function pointIntersection() {
//     let yCP = cutPlane.position.y
//     console.log(cutPlane.position)

//     for (let i = 0; i < lineData.length; i++) {
//         for (let j = 0; j < lineData[i][0].length; j++) {
//             let vect = lineData[i][0][j]
//             // console.log(vect.y, yCP)
//             if (vect.y >= yCP - 5 && vect.y <= yCP + 5) {
//                 console.log("At path it: " + i, vect, lineData[i][1])
//             }
//         }

//     }

// }

// add straight line as line
function addLine(x1, y1, x2, y2, z = 0, materialIN) {
    let points = []
    let v1 = new THREE.Vector3(x1, y1, z)
    let v2 = new THREE.Vector3(x2, y2, z)
    points.push(v1);
    // points.push(new THREE.Vector3((x1 - x2 / 2), y1, z));
    points.push(v2);
    allVect3.push(v1)
    allVect3.push(v2)


    // lineData.push([points, materialIN.color, uniqueID])
    // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

    // const line = new THREE.Line(geometry, material);
    // scene.add(line);
    // const line = new MeshLine();
    // line.setPoints(points);
    // // console.log(points)
    // const mesh = new THREE.Mesh(line, material);
    // const geometry = new THREE.BufferGeometry().setFromPoints(points);
    //    var lineG = new THREE.Geometry();
    //     		var vertices = lineG.vertices;
    // line.setPoints(points);

    // return points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new MeshLine();
    line.setGeometry(geometry);
    const mesh = new THREE.Mesh(line, materialIN);
    scene.add(mesh);
    // console.log("NEW LINE: ", v1, v2)

    let smV = v2.x < v1.x ? v2 : v1
    let bV = v2.x < v1.x ? v1 : v2


    //gen points for point array used to create layer slices 
    let vert = bV.x - smV.x == 0 ? 1 : 0
    // if (vert) { console.log(vert, v1, v2) }
    // if (bV.x - smV.x == 0) {
    //     //deal with this case
    // } else {
    let incrementX = (bV.x - smV.x) / (pointsSampleSize)
    let incrementY = Math.abs(bV.y - smV.y) / (pointsSampleSize)
    // console.log(incrementX, incrementY)
    for (let i = 0; i < (pointsSampleSize); i++) {
        let x = vert ? bV.x : i * incrementX
        let y = vert ? i * incrementY : ((((bV.y - smV.y) / (bV.x - smV.x)) * (x - smV.x)) + smV.y)
        // if (vert) { console.log(x, y) }
        points.push(new THREE.Vector3(x, y, z))
    }
    // }

    return points
}


// add bezier line as bezier
function addBezier(x1, y1, x2, y2, x3, y3, x4, y4, z = 0, materialIN) {
    // // console.log("bez: ", z)
    let v1 = new THREE.Vector3(x1, y1, z)
    let v2 = new THREE.Vector3(x2, y2, z)
    let v3 = new THREE.Vector3(x3, y3, z)
    let v4 = new THREE.Vector3(x4, y4, z)

    allVect3.push(v1, v2, v3, v4)


    const curve = new THREE.CubicBezierCurve3(
        v1,
        v2,
        v3,
        v4
    );
    const points = curve.getPoints(pointsSampleSize);
    // lineData.push([points, materialIN.color, uniqueID])
    // // console.log(points)
    // return points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    // Create the final object to add to the scene
    // const curveObject = new THREE.Line(geometry, materialML);
    // const line = new MeshLine();
    // line.setPoints(points);
    // // console.log(points)
    // // const material = new MeshLineMaterial(OPTIONS);
    // const mesh = new THREE.Mesh(geometry, material);
    // scene.add(curveObject)

    const line = new MeshLine();
    line.setGeometry(geometry);
    const mesh = new THREE.Mesh(line, materialIN);
    scene.add(mesh);
    return points
}

function renderSewing() {

}

/* <path class="cls-4" d="m299,666.5H0V0h103.5s.5,226,97.5,308c115.5,98.5,98,358.5,98,358.5"/>
    <path class="cls-2" d="m288,308C191,226,190.5,0,190.5,0h602s-.5,226-97,308c-116,98.5-98.5,358.5-98.5,358.5h-211s17.5-260-98-358.5"/>
    <path class="cls-3" d="m386.5,666.5h-87.5s17.5-260-98-358.5C104,226,103.5,0,103.5,0h87.5s.5,226,97.5,308c115.5,98.5,98,358.5,98,358.5"/>
    <path class="cls-4" d="m782.5,308C879.5,226,880,0,880,0h106.5v666.5h-302s-17.5-260,98-358.5"/>
    <path class="cls-1" d="m684.5,666.5h-87.5s-17.5-260,98-358.5C792,226,792,0,792,0h88s-.5,226-97.5,308c-115.5,98.5-98,358.5-98,358.5"/> */

function parseSvgPath(d) {
    // // console.log(d)
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
    // // console.log(tokens)

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
            // // console.log(tokens[i])
            cmd = tokens[i++];
        }
        // // console.log(cmd)
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
                // // console.log(`Unsupported SVG command: ${cmd}`)
                throw new Error(`Unsupported SVG command: ${cmd}`);
        }
    }

    // // console.log(curves)
    return curves;
}