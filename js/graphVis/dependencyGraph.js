import { GraphNode } from "./GraphNode"
import { getJSON } from "./jsonEditor"

export { renderData }

let nodes = new Map()
let edges = []


function renderData() {
    let json = getJSON()
    console.log(json)
    let xPos = 20
    let yPos = 50
    for (let type in json) {
        // console.log(type)
        if (type != "Loom") {
            for (let entry in json[type]) {
                // console.log(entry)
                let mappings = json[type][entry]["Mappings"]
                let edges = []
                // console.log(mappings)
                if (mappings) {
                    for (let map in mappings) {
                        edges.push(mappings[map])
                    }
                    // console.log(edges)
                    let out = edges.flat(Infinity)
                    // console.log(out)
                }
                nodes.set(entry, new GraphNode(entry, type, xPos, yPos, out))
                xPos += 40
            }
        } else {
            nodes.set(type, new GraphNode(type, type, xPos, yPos))
            // TODO add dependency between artwork and loom 
        }
        yPos += 50
        xPos = 20

    }
    drawEdges()
}

function drawEdges() {
    // console.log(nodes)
    for (const [name, node] of nodes) {
        // console.log(node)
        if (node.edges.length > 0) {
            for (let end in node.edges) {
                // console.log(end)
                //                 ctx.beginPath();
                // ctx.moveTo(20, 20);
                // ctx.bezierCurveTo(20, 100, 200, 100, 200, 20);
                // ctx.stroke();
            }

        }

    }

}