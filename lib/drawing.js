export const Drawing = class {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.stroke = [];
        this.strokes = [];
        this.color = "black";

        canvas.style['touch-action'] = 'none';
        canvas.width = options.width;
        canvas.height = options.height;

        let pointerId = undefined;
        let paint = false;

        const addClickOrTouch = (e) => {
            if (e.pointerId !== pointerId) {
                return;
            }

            let x, y;
            if (e.changedTouches) {
                const touch = e.changedTouches[0];
                const divBoundingBox = e.target.getBoundingClientRect();

                x = touch.clientX - divBoundingBox.x;
                y = touch.clientY - divBoundingBox.y;
            } else {
                x = e.offsetX;
                y = e.offsetY;
            }
            this.stroke.push({ x: x, y: y });
        };

        const onDown = (e) => {
            e.preventDefault();

            paint = true;
            pointerId = e.pointerId;
            addClickOrTouch(e);
            this.redraw();
        };

        canvas.onmousedown = onDown;
        canvas.onpointerdown = onDown;
        canvas.ontouchstart = onDown;

        const onMove = (e) => {
            e.preventDefault();

            if (paint) {
                addClickOrTouch(e);
                this.redraw();
            }
        };

        canvas.onmousemove = onMove;
        canvas.onpointermove = onMove;
        canvas.ontouchmove = onMove;

        const onStop = (e) => {
            e.preventDefault();

            if (this.stroke.length > 0) {
                this.strokes.push({
                    color: this.color,
                    points: this.stroke
                });
                this.stroke = [];

                this.redraw();
            }

            paint = false;
            pointerId = undefined;
        };

        canvas.onmouseup = onStop;
        canvas.onmouseleave = onStop;
        canvas.onpointerup = onStop;
        canvas.ontouchend = onStop;
        canvas.onpointerleave = onStop;
        canvas.onpointerout = onStop;
        canvas.onpointercancel = onStop;
        canvas.ontouchcancel = onStop;

        this.redraw();
    }

    drawStrokes(context, strokes) {
        context.save();
        context.lineJoin = "round";
        context.lineCap = "round";
        context.lineWidth = 5;

        strokes.forEach(stroke => {
            const line = stroke.points;

            if (line.length === 0) return;

            context.strokeStyle = stroke.color;

            context.beginPath();

            const { x, y } = line[0];
            context.moveTo(x, y);

            if (line.length > 1) {
                for (let i = 1; i < line.length; i++) {
                    const { x, y } = line[i];
                    context.lineTo(x, y);
                }
            } else {
                // A Point
                context.lineTo(x - 1, y);
            }

            context.stroke();
        });
        context.restore();
    }

    image() {
        return this.canvas;
    }

    redraw() {
        const context = this.canvas.getContext("2d");
        context.fillStyle = 'white';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        this.drawStrokes(context, this.strokes);
        this.drawStrokes(context, [{color: this.color, points: this.stroke}]);
    }

    setColor(color) {
        this.color = color;
    }

    undo() {
        this.pointerId = undefined;
        this.stroke = [];
        this.strokes.pop();
        this.paint = false;
        this.redraw();
    }

    clear() {
        this.pointerId = undefined;
        this.stroke = [];
        this.strokes = [];
        this.paint = false;
        this.redraw();
    }
}
