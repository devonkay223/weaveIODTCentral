export default class MainCanvas {
    constructor(name, zIn, xIn, yIn, width, height, background = "#ffffff") {
        this.canvas = document.getElementById(name + "Canvas");
        // console.log(this.canvas)
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = width; //window.innerWidth * (width / 100);
        this.canvas.height = height;//window.innerHeight * (height / 100);
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = yIn + "px";
        this.canvas.style.left = xIn + "px";
        this.canvas.style.zIndex = zIn
        this.backgroundColor = background
        this.xTop = xIn;
        this.yTop = yIn;
    }

    clearContext() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    background() {
        this.fill();
        // this.grid();
    }


    fill(color) {
        this.ctx.fillStyle = this.backgroundColor//"#000000" //"rgb(" + color + ", "+ color + ", "+ color + ")";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // this.ctx.strokeStyle = "#292929";
        // this.ctx.lineWidth = 2
        // this.ctx.strokeRect(this.xTop, this.yTop, this.canvas.width, this.canvas.height)
    }

    grid() {
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "rgb(242, 242, 242)";

        for (var x = 0; x < this.canvas.width; x += 10 * this.modifierCanvas) {
            for (var y = 0; y < this.canvas.height; y += 10 * this.modifierCanvas) {
                this.ctx.strokeRect(x, y, 10 * this.modifierCanvas, 10 * this.modifierCanvas);
            }
        }
    }


}