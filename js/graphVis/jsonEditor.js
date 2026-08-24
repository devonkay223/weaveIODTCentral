import { createJSONEditor, createAjvValidator, renderValue, EnumValue } from 'vanilla-jsoneditor'
import { extractData, workingJSON } from '../iodtProcessing';
import { immutableJSONPatch, insertAt, revertJSONPatch, setIn, updateIn } from 'immutable-json-patch'


// TODO define schema and add validation
// const validator = createAjvValidator({ schema, schemaDefinitions })
export { instantiateEditor, updatedContent, downloadIODT, getJSON, getData }

let content;
let editor;
let dataDef;

function instantiateEditor() {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', './js/dataDef.json', false);
    xobj.send(null);
    // // console.log(xobj.responseText)
    dataDef = JSON.parse(xobj.responseText);

    // var dataDef = workingJSON
    // console.log(dataDef)

    content = {
        // text: xobj.responseText
        json: dataDef
    }

    editor = createJSONEditor({
        target: document.getElementById('jsoneditor'),
        props: {
            content,
            onRenderValue,
            onChange: (updatedContent, previousContent, { contentErrors, patchResult }) => {
                // content is an object { json: JSONData } | { text: string }
                // console.log('onChange', { updatedContent, previousContent, contentErrors, patchResult })
                content = updatedContent
                if (patchResult.undo[0].path.includes("Color") || patchResult.undo[0].path.includes("LayerSystem")) {
                    // console.log("color changed", previousContent.patchResult)
                    extractData()
                }
            }
            ,
            validator: createAjvValidator({ schema })
        }
    });

    addStandardMenuItems()
}

function onRenderValue(props) {
    if (editor) {
        const key = props.path[props.path.length - 1]
        if (props.path.includes("Mappings")) {
            const jsonOut = editor.get()["json"]

            for (let type in dataDef) {
                if (key === type) {
                    let enumVals = []
                    for (let val in jsonOut[type]) {
                        enumVals.push({ "value": val, "text": val })
                    }

                    return [
                        {
                            component: EnumValue,
                            props: {
                                ...props,
                                options: enumVals
                            }
                        }
                    ]
                }
            }
        }
    }
    return renderValue(props)
}




function addStandardMenuItems() {


    let menuItems = []
    // let buttons = document.getElementsByClassName("editorButtons")

    for (let type in dataDef) {
        if (type != "Loom") {
            // console.log(type)
            let buttonNE = document.createElement("button")
            buttonNE.setAttribute("type", "button")
            // buttonNE.setAttribute("class", "newEntry")
            buttonNE.innerHTML = type
            document.getElementById("editorButtons").appendChild(buttonNE)
            // buttonNE.DataDisplay = dataDef[type]
            buttonNE.onclick = addNewStandardEntry
            // buttonNE.addEventListener("click", addNewStandardEntry())
        }
    }

}


const addNewStandardEntry = async e => {
    const type = e.target.innerHTML
    // const operations = [
    //     { op: 'add', path: '/', value: dataDef[type] }
    // ]

    // const updatedJson = immutableJSONPatch(content, operations)
    console.log(type, "called", dataDef[type])
    const contentOut = editor.get()

    let path = '/json/' + type + "/Name"
    if (contentOut['json'][type]["Name"]) {
        alert("Please name any unamed entries")
        return 0;
    }
    // editor.text = undefined
    const operations = [
        { op: 'add', path: path, value: dataDef[type]["Name"] }
    ]
    // const updatedContent = insertAt(contentOut, , dataDef[type])//setIn(contentOut, ["text"], JSON.stringify(dataDef[type]))
    console.log('operations', operations)

    const updatedDocument = immutableJSONPatch(contentOut, operations)
    console.log('updatedDocument', typeof (updatedDocument["json"]))
    const contentNew = {
        json: updatedDocument["json"]
    }

    editor.update(contentNew)
    // return dataDef[type]

}

function updatedContent() {
    const contentNew = {
        json: workingJSON
    }

    editor.update(contentNew)
    // editor.expand("", true)
}

function updateEdgesFromMappings() {

}



// console.log(dataDef.Loom)

// editor.collapse(dataDef.FormPieces.Geometry, true)


const schema = {
    title: 'Loom',
    description: 'Loom specification object',
    type: 'object',
    properties: {
        TotalWarpEnds: {
            title: 'Total Warp Ends',
            description: 'Number of warp ends.',
            type: 'integer'
        },
        TotalEndHooks: {
            title: 'Total End Hooks',
            description: 'Number of ends per repeat.',
            type: 'integer'
        },
        WeftSelectors: {
            title: 'Weft Selectors',
            description: 'Number of weft yarns.',
            type: 'integer'
        },
        EndsPerCm: {
            title: 'Ends per centimeter',
            type: 'integer',
        },
        NumberOfRepeats: {
            title: "Number of Repeats",
            description: 'Number of repeats in the loom config.',
            type: 'integer',
        },
        TypeOfRepeat: {
            title: "Type of Repeat",
            type: 'string',
            examples: ['repeat', 'mirrored']
        },
        WarpFiber: {
            title: "Warp Fibers",
            type: 'array',
            items: {
                type: "string",
                enum: ["test", "2values"]//getFiberEntries()
            }
        }
    }
    // ,
    // required: ['TotalWarpEnds']
}

function downloadIODT() {
    const jsonOut = editor.get()
    // alert(JSON.stringify(jsonOut, null, 2).replace(/\\n/g, ''))

    // JSON.stringify(exportObj, null, 2)
    let exportName = document.getElementById("file-name-input").value

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonOut["json"], null, 4));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function getJSON() {
    return editor.get()["json"]
}

function getData(type, dataId, alertBool = 0) {
    const jsonOut = editor.get()
    // console.log(jsonOut)
    let data = jsonOut["json"][type][dataId]
    // console.log(data, typeof (data))
    if (data) {
        return data
    } else if (alertBool) {
        alert(type + ": " + dataId + "  - missing entry")
        return undefined
    }
}