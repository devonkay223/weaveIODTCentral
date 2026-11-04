import { dataDef, getData, getJSON } from "./graphVis/jsonEditor.js"
import { colorPaletteHex, imgRatio } from "./iodtProcessing.js"

export { exportAdaCAD }

let adaJSONBase = {}
let weaveMap = { "": "" }


async function genAdaCADWorkspace() {
    let json = getJSON()


    let loomData = json["Loom"]
    let artworkData = json["ArtworkAreas"]
    var keys = Object.keys(artworkData)

    // extract data
    let numEnds = loomData["TotalWarpEnds"]
    let calcHeight = (1 / imgRatio) * numEnds
    let epcm = loomData["EndsPerCm"]
    let sampleSystem = artworkData[keys[0]]["LayerSystem"].replace(/[()]/g, '')
    let warpSys = sampleSystem.match(/\d/g)?.length || 0; //matches on digits
    let weftSys = sampleSystem.match(/\D/g)?.length || 0; //matches on non-digits

    // gen unique ids for adacad nodes
    let draftyID = genID()
    let imageID = genID()


    initializeBaseJSON(draftyID, imageID, numEnds, calcHeight, epcm, warpSys, weftSys, Array.from(colorPaletteHex))

    // add layer notation nodes + embeded drafts + connections to drafty
    let systemsAdded = []

    for (let i = 0; i < keys.length; i++) {
        const art = artworkData[keys[i]]
        const ls = art.LayerSystem.toLowerCase()


        // NOTE putting a weave structure name into WeaveStructureCompiled is a hack to assign the same structure to all inputs
        const weave = art.Mappings.WeaveStructureCompiled
        let weaves = []

        addWeave(weave)

        //check if weave is specified at form level 
        if (weave == '') {
            const forms = art.Mappings.FormPieces
            const formData = json["FormPieces"]
            for (let j = 0; j < forms.length; j++) {
                let fWeave = formData[forms[j]].Mappings.WeaveStructure
                if (fWeave != "") {
                    addWeave(fWeave)
                    weaves.push(fWeave)
                }
            }
        } else {
            //if specified at artwork level parse
            addWeave(weave)
            weaves.push(weave)
        }

        if (!systemsAdded.includes(ls)) {
            addLayerNotation(ls, draftyID, i, weaves)
            systemsAdded.push(ls)
        } else if (weaves.length != 0) {
            //if weave structure needs to be connected to a layer system but the ls already exists, add connection (will overwrite if there are conflicting specs)
            let opId = findOpID("notation", ls)
            connectWeavestoLayer(weaves, opId)
        }
    }

}

//not inlcuded in zip file
async function exportAdaCAD(download = 1) {

    await genAdaCADWorkspace()
    let exportName = document.getElementById("file-name-input").value

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(adaJSONBase, null, 4));
    if (download) {
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".ada");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // return adaJSONBase
}

function addWeave(weaveIn) {
    const adaCADStructures = ["tabby", "twill", "satin"]
    if (adaCADStructures.includes(weaveIn) && weaveMap[weaveIn] == undefined) {

        const params = {
            "satin": [5, 2, 0],
            "tabby": [1, 1, 1, 1],
            "twill": [1, 3, 0, 0]
        }

        let id = genID()
        let x = 2231.023102310231 + ((Object.keys(weaveMap).length) * 1000)
        let node = {
            "node_id": id,
            "type": "op",
            "topleft": {
                "x": x,
                "y": 138.6138613861386
            }
        }

        let tree = {
            "node": id,
            "parent": -1,
            "inputs": [],
            "outputs": []
        }

        let op = {
            "node_id": id,
            "name": weaveIn,
            "params": params[weaveIn],
            "inlets": []
        }

        addToBase(node, tree, op)
        let weavedraftId = genDraft(id, weaveIn + "(" + params[weaveIn].toString() + ")") //draft that gets nested into operation for preview
        weaveMap[weaveIn] = weavedraftId
    }
}

function findOpID(nameIn, paramIn = '') {
    const source = adaJSONBase["ops"]
    for (let i = 0; i < source.length; i++) {
        if (source[i].name == nameIn && source[i].params[0] == paramIn) {
            return source[i].node_id
        }
    }

}


function addLayerNotation(systemIn, draftyID, i, weaveArray = []) {
    let opID = genID() //gen unique id

    let x = 1389.1050583657586 + (i * 850)
    let node = {
        "node_id": opID,
        "type": "op",
        "topleft": {
            "x": x,
            "y": 1143.9688715953307
        }
    }

    let tree = {
        "node": opID,
        "parent": -1,
        "inputs": [],
        "outputs": []
    }


    let inlets = [0]
    let sys = systemIn
    while (sys.length > 0) {
        let str = sys.substring(sys.indexOf("\(") + 1, sys.indexOf("\)"))
        inlets.push(str)
        sys = sys.substring(sys.indexOf("\)") + 1, sys.length)
    }

    let op = {
        "node_id": opID,
        "name": "notation",
        "params": [systemIn],
        "inlets": inlets
    }

    addToBase(node, tree, op)
    genDraft(opID) //draft that gets nested into operation for preview
    genConnection(draftyID, opID)
    connectWeavestoLayer(weaveArray, opID, inlets)
}

function connectWeavestoLayer(weaveArray, opID, inlets) {
    if (weaveArray.length == 1) {
        for (let i = 0; i < (inlets.length - 1); i++) {
            genConnection(weaveMap[weaveArray[0]], opID)
        }
    }

    // weave per layer 
    if (weaveArray.length > 1) {
        for (let i = 0; i < (inlets.length - 1); i++) {
            genConnection(weaveMap[weaveArray[i]], opID)
        }
    }
}


//this is the AdaCAD id generation function from https://github.com/UnstableDesign/AdaCAD/blob/main/packages/adacad-drafting-lib/src/utils/utils.ts
function genID(len = 8) {
    let basis = 1;
    for (let i = 0; i < len; i++) {
        basis = basis * 10;
    }
    const min = basis / 10;
    const max = basis - 1;

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Generates a bidirectional connection between the input node and the output node
function genConnection(inputIn, outputIn) {

    const id = genID()

    //adds connector as an input/output for the nodes were tryung to connect
    addTreeOutput(inputIn, id)
    addTreeInput(outputIn, id)

    let node = {
        "node_id": id,
        "type": "cxn",
        "topleft": {
            "x": 0,
            "y": 0
        }
    }

    let tree = {
        "node": id,
        "parent": -1,
        "inputs": [
            {
                "tn": inputIn,
                "ndx": 0
            }
        ],
        "outputs": [
            {
                "tn": outputIn,
                "ndx": 0
            }
        ]
    }

    addToBase(node, tree)

}

// adds input id to the list of inputs from atID, allows us to inject connectors after establishing the base nodes
function addTreeInput(atID, inputID) {
    let tree = adaJSONBase.tree

    for (let i = 0; i < tree.length; i++) {
        if (tree[i].node == atID) {
            let input = {
                "tn": inputID,
                "ndx": tree[i].inputs.length
            }

            tree[i].inputs.push(input)
        }
    }
}

// adds out id to the list of outputs from atID, allows us to inject connectors after establishing the base nodes
function addTreeOutput(atID, outputID) {
    let tree = adaJSONBase.tree

    for (let i = 0; i < tree.length; i++) {
        if (tree[i].node == atID) {
            let output = {
                "tn": outputID,
                "ndx": tree[i].outputs.length
            }
            tree[i].outputs.push(output)
        }
    }
}

//generates draft that is nested into a node as vis of operation 
function genDraft(nodeID, nameIn = "[object Object]") {

    let id = genID()

    let node = {
        "node_id": id,
        "type": "draft",
        "topleft": {
            "x": 0,
            "y": 0
        }
    }

    let tree = {
        "node": id,
        "parent": nodeID,
        "inputs": [],
        "outputs": []
    }

    let draft = {
        "node_id": id,
        "draft_id": id,
        "ud_name": "",
        "gen_name": nameIn,
        "notes": "",
        "draft_visible": true,
        "loom": null,
        "loom_settings": {
            "frames": 8,
            "treadles": 8,
            "epi": 12,
            "ppi": 12,
            "units": "cm",
            "type": "jacquard"
        },
        "render_colors": false,
        "scale": 1,
        "draft_editing_source": "drawdown"
    }

    addToBase(node, tree, 0, draft)

    // these draft nodes have to have a connector to their parent node they are nested in 
    genConnection(nodeID, id)

    return id
}


// adds nodes, trees, ops, or drafts to the corrsponding part of the base file setup 
function addToBase(nodeIn = 0, treeIn = 0, opIn = 0, draftIn = 0) {
    if (nodeIn) { adaJSONBase["nodes"].push(nodeIn) }
    if (treeIn) { adaJSONBase["tree"].push(treeIn) }
    if (opIn) { adaJSONBase["ops"].push(opIn) }
    if (draftIn) { adaJSONBase["draft_nodes"].push(draftIn) }
}


function initializeBaseJSON(draftIDIn, imageIDIn, endsIn, heightIn, epcmIn, warpSysIn, weftSysIn, colorIn) {
    adaJSONBase = {
        "version": "5.1.7",
        "workspace": {
            "min_frames": 8,
            "min_treadles": 8,
            "type": "jacquard",
            "epi": epcmIn,
            "ppi": 12,
            "units": "cm",
            "show_materials": true,
            "black_cell_up": true,
            "number_threading": false,
            "selected_origin_option": 3,
            "file_favorites": [],
            "hide_mixer_drafts": false,
            "show_advanced_operations": true,
            "oversize_dim_threshold": 10000,
            "max_draft_input_area": 6250000
        },
        "type": "mixer",
        "zoom": {
            "editor": 0.303,
            "mixer": 0.215
        },
        "nodes": [
            {
                "node_id": draftIDIn,
                "type": "draft",
                "topleft": {
                    "x": 1358.1393929414971,
                    "y": 251.16277295489644
                }
            },
            {
                "node_id": imageIDIn,
                "type": "op",
                "topleft": {
                    "x": 1311.6279069767443,
                    "y": 2213.953488372093
                }
            },
            {
                "node_id": 83849388,
                "type": "draft",
                "topleft": {
                    "x": 0,
                    "y": 0
                }
            },
            {
                "node_id": 56045764,
                "type": "cxn",
                "topleft": {
                    "x": 0,
                    "y": 0
                }
            }
        ],
        "tree": [
            {
                "node": draftIDIn,
                "parent": -1,
                "inputs": [],
                "outputs": []
            },
            {
                "node": imageIDIn,
                "parent": -1,
                "inputs": [],
                "outputs": [
                    {
                        "tn": 56045764,
                        "ndx": 0
                    }
                ]
            },
            {
                "node": 83849388,
                "parent": imageIDIn,
                "inputs": [
                    {
                        "tn": 56045764,
                        "ndx": 0
                    }
                ],
                "outputs": []
            },
            {
                "node": 56045764,
                "parent": -1,
                "inputs": [
                    {
                        "tn": imageIDIn,
                        "ndx": 0
                    }
                ],
                "outputs": [
                    {
                        "tn": 83849388,
                        "ndx": 0
                    }
                ]
            }
        ],
        "draft_nodes": [
            {
                "node_id": draftIDIn,
                "draft_id": draftIDIn,
                "ud_name": "",
                "gen_name": "drafty",
                "notes": "",
                "draft_visible": true,
                "loom": null,
                "loom_settings": {
                    "type": "jacquard",
                    "epi": epcmIn,
                    "ppi": 12,
                    "units": "cm",
                    "frames": 8,
                    "treadles": 8
                },
                "render_colors": true,
                "scale": 0.215,
                "draft_editing_source": "drawdown",
                "compressed_draft": {
                    "id": draftIDIn,
                    "ud_name": "",
                    "gen_name": "drafty",
                    "warps": warpSysIn,
                    "wefts": weftSysIn,
                    "compressed_drawdown": Array(warpSysIn * weftSysIn).fill(0),
                    "rowSystemMapping": Array.from({ length: weftSysIn }, (e, i) => i), //assignes weft system values
                    "rowShuttleMapping": Array.from({ length: weftSysIn }, (e, i) => i), //weft colors
                    "colSystemMapping": Array.from({ length: warpSysIn }, (e, i) => i), //assigns warp systems values
                    "colShuttleMapping": Array.from({ length: warpSysIn }, (e, i) => i + weftSysIn) //warp colors
                }
            },
            {
                "node_id": 83849388,
                "draft_id": 83849388,
                "ud_name": "",
                "gen_name": "image",
                "notes": "",
                "draft_visible": true,
                "loom": null,
                "loom_settings": {
                    "frames": 8,
                    "treadles": 8,
                    "epi": epcmIn,
                    "ppi": 12,
                    "units": "cm",
                    "type": "jacquard"
                },
                "render_colors": true,
                "scale": 1,
                "draft_editing_source": "drawdown"
            }
        ],
        "ops": [
            {
                "node_id": imageIDIn,
                "name": "imagemap",
                "params": [
                    0,
                    endsIn,
                    heightIn
                ],
                "inlets": [],
            }
        ],
        "notes": [],
        "materials": [
            {
                "id": 0,
                "name": "black",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#333333",
                "thickness": 100,
                "diameter": 1,
                "type": 0,
                "notes": "",
                "rgb": {
                    "r": 51,
                    "g": 51,
                    "b": 51
                }
            },
            {
                "id": 1,
                "name": "white",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#f9f8f3",
                "thickness": 100,
                "diameter": 1,
                "type": 0,
                "notes": "",
                "rgb": {
                    "r": 249,
                    "g": 248,
                    "b": 243
                }
            },
            {
                "id": 2,
                "name": "red",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#d55e00",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 213,
                    "g": 94,
                    "b": 0
                }
            },
            {
                "id": 3,
                "name": "orange",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#e69f00",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 230,
                    "g": 159,
                    "b": 0
                }
            },
            {
                "id": 4,
                "name": "yellow",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#f0e442",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 240,
                    "g": 228,
                    "b": 66
                }
            },
            {
                "id": 5,
                "name": "green",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#4aff4a",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 74,
                    "g": 255,
                    "b": 74
                }
            },
            {
                "id": 6,
                "name": "dark green",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#009e73",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 0,
                    "g": 158,
                    "b": 115
                }
            },
            {
                "id": 7,
                "name": "dark blue",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#0072b2",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 0,
                    "g": 114,
                    "b": 178
                }
            },
            {
                "id": 8,
                "name": "blue",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#56b4e9",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 86,
                    "g": 180,
                    "b": 233
                }
            },
            {
                "id": 9,
                "name": "violet",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#cc79a7",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 204,
                    "g": 121,
                    "b": 167
                }
            },
            {
                "id": 10,
                "name": "grey",
                "stretch": 1,
                "insert": true,
                "visible": true,
                "color": "#aaaaaa",
                "thickness": 100,
                "diameter": 1,
                "type": 1,
                "notes": "",
                "rgb": {
                    "r": 170,
                    "g": 170,
                    "b": 170
                }
            }
        ],
        "indexed_image_data": []
    }


}

// 68569839 - drafty node
// 45372171 - image map
// 22725515 - image map nested draft
// 99212376 - image map -> nested draft cnx

// let v1 = {
//     "version": "5.0.9",
//     "workspace": {
//         "min_frames": 8,
//         "min_treadles": 10,
//         "type": "jacquard",
//         "epi": 10,
//         "ppi": 12,
//         "units": "cm",
//         "show_materials": true,
//         "black_cell_up": true,
//         "number_threading": false,
//         "selected_origin_option": 3,
//         "file_favorites": [],
//         "hide_mixer_drafts": false,
//         "show_advanced_operations": true,
//         "oversize_dim_threshold": 2500,
//         "max_draft_input_area": 6250000
//     },
//     "type": "mixer",
//     "zoom": {
//         "editor": 1.697,
//         "mixer": 0.527
//     },
//     "nodes": [
//         {
//             "node_id": 68569839,
//             "type": "draft",
//             "topleft": {
//                 "x": 3923.3654390934844,
//                 "y": 404.628895184136
//             }
//         },
//         {
//             "node_id": 45372171,
//             "type": "op",
//             "topleft": {
//                 "x": 3527.391231028668,
//                 "y": 2196.8887015177065
//             }
//         },
//         {
//             "node_id": 22725515,
//             "type": "draft",
//             "topleft": {
//                 "x": 0,
//                 "y": 0
//             }
//         },
//         {
//             "node_id": 99212376,
//             "type": "cxn",
//             "topleft": {
//                 "x": 0,
//                 "y": 0
//             }
//         },
//     ],
//     "tree": [
//         {
//             "node": 68569839,
//             "parent": -1,
//             "inputs": [],
//             "outputs": [
//                 //TODO populate ouput connections as layer nodes get added
//             ]
//         },
//         {
//             "node": 45372171,
//             "parent": -1,
//             "inputs": [
//                 // TODO populate based on number of colors
//             ],
//             "outputs": [
//                 {
//                     "tn": 99212376,
//                     "ndx": 0
//                 }
//             ]
//         },
//         {
//             "node": 22725515,
//             "parent": 45372171,
//             "inputs": [
//                 {
//                     "tn": 99212376,
//                     "ndx": 0
//                 }
//             ],
//             "outputs": []
//         },
//         {
//             "node": 99212376,
//             "parent": -1,
//             "inputs": [
//                 {
//                     "tn": 45372171,
//                     "ndx": 0
//                 }
//             ],
//             "outputs": [
//                 {
//                     "tn": 22725515,
//                     "ndx": 0
//                 }
//             ]
//         },
//     ],
//     "draft_nodes": [
//         {
//             "node_id": 68569839,
//             "draft_id": 68569839,
//             "ud_name": "",
//             "gen_name": "drafty",
//             "notes": "",
//             "draft": null,
//             "compressed_draft": {
//                 "id": 68569839,
//                 "ud_name": "",
//                 "gen_name": "drafty",
//                 "warps": 3, //TODO process num of warp and weft systems 
//                 "wefts": 3,
//                 "compressed_drawdown": [ //TODO size from warp and weft systems 
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0
//                 ], //TODO any mods here? 
//                 "rowSystemMapping": [
//                     0,
//                     1,
//                     2
//                 ],
//                 "rowShuttleMapping": [
//                     9,
//                     8,
//                     2
//                 ],
//                 "colSystemMapping": [
//                     0,
//                     1,
//                     2
//                 ],
//                 "colShuttleMapping": [
//                     9,
//                     8,
//                     2
//                 ]
//             },
//             "draft_visible": true,
//             "loom": null,
//             "loom_settings": {
//                 "type": "jacquard",
//                 "epi": 10, //TODO update
//                 "ppi": 12,
//                 "frames": 8,
//                 "treadles": 10,
//                 "units": "cm"
//             },
//             "render_colors": true,
//             "scale": 1
//         },
//         {
//             "node_id": 22725515,
//             "draft_id": 22725515,
//             "ud_name": "",
//             "gen_name": "basicDemoFormFinal", //TOOD name? 
//             "notes": "",
//             "draft": null,
//             "compressed_draft": null,
//             "draft_visible": true,
//             "loom": null,
//             "loom_settings": {
//                 "type": "jacquard",
//                 "epi": 10, // TODO update
//                 "ppi": 12,
//                 "units": "cm",
//                 "frames": 8,
//                 "treadles": 10
//             },
//             "render_colors": true,
//             "scale": 1
//         }
//     ],
//     "ops": [
//         {
//             "node_id": 45372171,
//             "name": "imagemap",
//             "params": [
//                 26427815,
//                 960, //TODO populate from loom spec
//                 649
//             ],
//             "inlets": [ //TODO source from color specs in artwork
//             ]
//         }
//     ],
//     "notes": [],
//     "materials": [],

// }

// let v2 = {
//     "version": "5.0.9",
//     "workspace": {
//         "min_frames": 8,
//         "min_treadles": 10,
//         "type": "jacquard",
//         "epi": 10,
//         "ppi": 12,
//         "units": "cm",
//         "show_materials": true,
//         "black_cell_up": true,
//         "number_threading": false,
//         "selected_origin_option": 3,
//         "file_favorites": [],
//         "hide_mixer_drafts": false,
//         "show_advanced_operations": true,
//         "oversize_dim_threshold": 2500,
//         "max_draft_input_area": 6250000
//     },
//     "type": "mixer",
//     "zoom": {
//         "editor": 1.697,
//         "mixer": 0.527
//     },
//     "nodes": [
//         {
//             "node_id": 68569839,
//             "type": "draft",
//             "topleft": {
//                 "x": 3923.3654390934844,
//                 "y": 404.628895184136
//             }
//         },
//         {
//             "node_id": 45372171,
//             "type": "op",
//             "topleft": {
//                 "x": 3527.391231028668,
//                 "y": 2196.8887015177065
//             }
//         },
//         {
//             "node_id": 22725515,
//             "type": "draft",
//             "topleft": {
//                 "x": 0,
//                 "y": 0
//             }
//         },
//         {
//             "node_id": 99212376,
//             "type": "cxn",
//             "topleft": {
//                 "x": 0,
//                 "y": 0
//             }
//         },
//     ],
//     "tree": [
//         {
//             "node": 68569839,
//             "parent": -1,
//             "inputs": [],
//             "outputs": [

//             ]
//         },
//         {
//             "node": 45372171,
//             "parent": -1,
//             "inputs": [

//             ],
//             "outputs": [
//                 {
//                     "tn": 99212376,
//                     "ndx": 0
//                 }
//             ]
//         },
//         {
//             "node": 22725515,
//             "parent": 45372171,
//             "inputs": [
//                 {
//                     "tn": 99212376,
//                     "ndx": 0
//                 }
//             ],
//             "outputs": []
//         },
//         {
//             "node": 99212376,
//             "parent": -1,
//             "inputs": [
//                 {
//                     "tn": 45372171,
//                     "ndx": 0
//                 }
//             ],
//             "outputs": [
//                 {
//                     "tn": 22725515,
//                     "ndx": 0
//                 }
//             ]
//         },
//     ],
//     "draft_nodes": [
//         {
//             "node_id": 68569839,
//             "draft_id": 68569839,
//             "ud_name": "",
//             "gen_name": "drafty",
//             "notes": "",
//             "draft_visible": true,
//             "loom": null,
//             "loom_settings": {
//                 "type": "jacquard",
//                 "epi": 12,
//                 "ppi": 12,
//                 "units": "cm",
//                 "frames": 8,
//                 "treadles": 8
//             },
//             "render_colors": true,
//             "scale": 0.215,
//             "draft_editing_source": "drawdown",
//             "compressed_draft": {
//                 "id": 68569839,
//                 "ud_name": "",
//                 "gen_name": "drafty",
//                 "warps": 3,
//                 "wefts": 3,
//                 "compressed_drawdown": [
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0,
//                     0
//                 ],
//                 "rowSystemMapping": [
//                     0,
//                     1,
//                     2
//                 ],
//                 "rowShuttleMapping": [
//                     9,
//                     8,
//                     2
//                 ],
//                 "colSystemMapping": [
//                     0,
//                     1,
//                     2
//                 ],
//                 "colShuttleMapping": [
//                     9,
//                     8,
//                     2
//                 ]
//             }
//         },
//         {
//             "node_id": 22725515,
//             "draft_id": 22725515,
//             "ud_name": "",
//             "gen_name": "image",
//             "notes": "",
//             "draft_visible": true,
//             "loom": null,
//             "loom_settings": {
//                 "type": "jacquard",
//                 "epi": 10,
//                 "ppi": 12,
//                 "units": "cm",
//                 "frames": 8,
//                 "treadles": 10
//             },
//             "render_colors": true,
//             "scale": 1,
//             "draft_editing_source": "drawdown"
//         }
//     ],
//     "ops": [
//         {
//             "node_id": 45372171,
//             "name": "imagemap",
//             "params": [
//                 0,
//                 960,
//                 649
//             ],
//             "inlets": [
//             ]
//         }
//     ],
//     "notes": [],
//     "materials": [

//         {
//             "id": 0,
//             "name": "black",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#333333",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 0,
//             "notes": "",
//             "rgb": {
//                 "r": 51,
//                 "g": 51,
//                 "b": 51
//             }
//         },
//         {
//             "id": 1,
//             "name": "white",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#f9f8f3",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 0,
//             "notes": "",
//             "rgb": {
//                 "r": 249,
//                 "g": 248,
//                 "b": 243
//             }
//         },
//         {
//             "id": 2,
//             "name": "red",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#d55e00",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 213,
//                 "g": 94,
//                 "b": 0
//             }
//         },
//         {
//             "id": 3,
//             "name": "orange",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#e69f00",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 230,
//                 "g": 159,
//                 "b": 0
//             }
//         },
//         {
//             "id": 4,
//             "name": "yellow",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#f0e442",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 240,
//                 "g": 228,
//                 "b": 66
//             }
//         },
//         {
//             "id": 5,
//             "name": "green",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#4aff4a",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 74,
//                 "g": 255,
//                 "b": 74
//             }
//         },
//         {
//             "id": 6,
//             "name": "dark green",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#009e73",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 0,
//                 "g": 158,
//                 "b": 115
//             }
//         },
//         {
//             "id": 7,
//             "name": "dark blue",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#0072b2",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 0,
//                 "g": 114,
//                 "b": 178
//             }
//         },
//         {
//             "id": 8,
//             "name": "blue",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#56b4e9",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 86,
//                 "g": 180,
//                 "b": 233
//             }
//         },
//         {
//             "id": 9,
//             "name": "violet",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#cc79a7",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 204,
//                 "g": 121,
//                 "b": 167
//             }
//         },
//         {
//             "id": 10,
//             "name": "grey",
//             "stretch": 1,
//             "insert": true,
//             "visible": true,
//             "color": "#aaaaaa",
//             "thickness": 100,
//             "diameter": 1,
//             "type": 1,
//             "notes": "",
//             "rgb": {
//                 "r": 170,
//                 "g": 170,
//                 "b": 170
//             }
//         }
//     ],

//     "indexed_image_data": [],
// }
