import { dGraphMC } from "../main.js"


export class GraphNode {
    constructor(nameIn, typeIn, xIn, yIn, edgesIn = []) {
        this.name = nameIn
        this.type = typeIn
        this.xPos = xIn
        this.yPos = yIn
        this.edges = edgesIn

        this.drawNode()

    }

    drawNode() {
        let size = 30
        let ctx = dGraphMC.ctx
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.roundRect(this.xPos, this.yPos, size, size, size / 5)
        ctx.stroke();
    }

    setEdges() {

    }
}