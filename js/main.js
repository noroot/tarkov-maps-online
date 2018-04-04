$(function() {

    let config = {
        apiKey: "AIzaSyA5lTYnpK5UvXqovsDHbBDNdEugtHGXXuU",
        authDomain: "image-editor-2f1dc.firebaseapp.com",
        databaseURL: "https://image-editor-2f1dc.firebaseio.com",
        projectId: "image-editor-2f1dc",
        storageBucket: "",
        messagingSenderId: "154243994182"
    };

    firebase.initializeApp(config);

    $(".tools").draggable();

    let roomID = getUrlParameter("room") || "prueba1";

    let uID = Math.floor(Math.random() * 100000).toString();

    let db = firebase.database();

    let editorValues = db.ref("rooms");

    let currentEditorValue = editorValues.child(roomID);

    let openPageTimestamp = Date.now();

    let canvas = null;

    currentEditorValue.child("content").once("value", function (data) {

        canvas = new fabric.Canvas('c', {
            isDrawingMode: true
        });

        let drawingColor = $('#drawing-color'),
            drawingLineWidth = $('#drawing-line-width');

        $('#clear-canvas').on('click', function () {
            clear();
        });

        $('#background-options').on('change', function () {
            setBackground(this.value);
            clear();

            currentEditorValue.update({
                map: this.value
            });
        });

        drawingColor.on("change", function () {
            canvas.freeDrawingBrush.color = this.value;
        });

        drawingLineWidth.on('change', function () {
            canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
            $(this).prev("span").text(this.value);
        });

        $(".colors div").on('click', function () {
            let value = $(this).attr('id');
            canvas.freeDrawingBrush.color = value;
            drawingColor.val(value);
        });

        $("#line-drawing").on('click', function () {
           canvas.isDrawingMode = true;
        });

        $("#arrow-drawing").on('click', function () {
           canvas.isDrawingMode = false;
        });

        function setBackground(backgroundImage) {
            if (backgroundImage === "none") {
                canvas.backgroundImage = 0;
                canvas.setBackgroundColor({source: 'img/grid.png', repeat: 'repeat'}, function () {
                    canvas.renderAll();
                });
            } else {
                fabric.Image.fromURL('img/' + backgroundImage + '.png', function (img) {
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                        scaleX: canvas.width / img.width,
                        scaleY: canvas.height / img.height
                    });
                });
            }
        }

        function clear() {
            canvas.clear();
            setBackground($('#background-options').val());
        }

        function editorChange() {
            if (canvas.freeDrawingBrush) {
                canvas.freeDrawingBrush.color = drawingColor.val();
                canvas.freeDrawingBrush.width = parseInt(drawingLineWidth.val(), 10) || 1;
            }
        }

        editorChange();
        //new Arrow(canvas);
        //new Circle(canvas);

        currentEditorValue.child("map").on("value", function (opt) {
            let value = opt.val();
            let select = $('#background-options');

            if (select.val() !== value) {
                select.val(value);
                setBackground(value);
            }
        });

        $(document).on('keydown', null, 'F2', clear);

        let queueRef = currentEditorValue.child("queue");

        let syncing = false;

        canvas.on("object:added", function(data) {

            if (syncing) {
                return;
            }

            currentEditorValue.update({
                content: JSON.stringify(canvas)
            });

            queueRef.push().set({
                event: JSON.stringify(data.target),
                by: uID,
                time: Date.now().toString()
            });
        });

        canvas.on('canvas:cleared', function () {

            if (syncing) {
                return;
            }

            currentEditorValue.update({
                content: JSON.stringify(canvas)
            });

            queueRef.push().set({
                event: "clear",
                by: uID,
                time: Date.now().toString()
            }).then(() => {
                queueRef.remove()
            });

        });

        queueRef.on("child_added", function (ref) {

            let value = ref.val();
            let timestamp = value.time;

            if (openPageTimestamp > timestamp) {
                return;
            }
            if (value.by === uID) {
                return;
            }

            syncing = true;

            if (value.event === "clear") {
                clear();
            } else {
                let newObj = JSON.parse(value.event);
                new fabric[fabric.util.string.capitalize(newObj.type)].fromObject(newObj, function (obj) {
                    canvas.add(obj);
                });
            }

            syncing = false;
        });

        let val = data.val();

        if (val === null) {
            val = JSON.stringify(canvas);

            editorValues.child(roomID).set({
                content: val,
                map: "none",
                queue: {}
            });
        }

        syncing = true;

        canvas.loadFromJSON(JSON.parse(val));
        currentEditorValue.child("map").once("value", function (content) {
            let val = content.val();
            setBackground(val);
        });

        syncing = false;

        $("#loader").fadeOut();
        $("#wrapper").fadeIn();

    });

    function getUrlParameter(myParam) {
        let url = decodeURIComponent(window.location.search.substring(1));
        let urlParams = url.split('&');

        for (let i = 0; i < urlParams.length; i++) {
            let currentParam = urlParams[i].split('=');

            if (currentParam[0] === myParam) {
                return currentParam[1] === undefined ? true : currentParam[1];
            }
        }

        return null;
    }


    /*var Circle = (function() {
        function Circle(canvas) {
            this.canvas = canvas;
            this.className = 'Circle';
            this.isDrawing = false;
            this.bindEvents();
        }

        Circle.prototype.bindEvents = function() {
            var inst = this;
            inst.canvas.on('mouse:down', function(o) {
                inst.onMouseDown(o);
            });
            inst.canvas.on('mouse:move', function(o) {
                inst.onMouseMove(o);
            });
            inst.canvas.on('mouse:up', function(o) {
                inst.onMouseUp(o);
            });
            inst.canvas.on('object:moving', function(o) {
                inst.disable();
            })
        }

        Circle.prototype.onMouseUp = function(o) {
            var inst = this;
            inst.disable();
        };

        Circle.prototype.onMouseMove = function(o) {
            var inst = this;
            if (!inst.isEnable()) {
                return;
            }

            var pointer = inst.canvas.getPointer(o.e);
            var activeObj = inst.canvas.getActiveObject();

            activeObj.stroke = 'red',
                activeObj.strokeWidth = 5;
            activeObj.fill = 'red';

            if (origX > pointer.x) {
                activeObj.set({
                    left: Math.abs(pointer.x)
                });
            }

            if (origY > pointer.y) {
                activeObj.set({
                    top: Math.abs(pointer.y)
                });
            }

            activeObj.set({
                rx: Math.abs(origX - pointer.x) / 2
            });
            activeObj.set({
                ry: Math.abs(origY - pointer.y) / 2
            });
            activeObj.setCoords();
            inst.canvas.renderAll();
        };

        Circle.prototype.onMouseDown = function(o) {
            var inst = this;
            inst.enable();

            var pointer = inst.canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;

            var ellipse = new fabric.Ellipse({
                top: origY,
                left: origX,
                rx: 0,
                ry: 0,
                transparentCorners: false,
                hasBorders: false,
                hasControls: false
            });

            inst.canvas.add(ellipse).setActiveObject(ellipse);
        };

        Circle.prototype.isEnable = function() {
            if (this.canvas.isDrawingMode) return false;
            else return this.isDrawing;
        }

        Circle.prototype.enable = function() {
            this.isDrawing = true;
        }

        Circle.prototype.disable = function() {
            this.isDrawing = false;
        }

        return Circle;
    }());*/

    /*var Arrow = (function() {
        function Arrow(canvas) {
            this.canvas = canvas;
            this.className = 'Arrow';
            this.isDrawing = false;
            this.bindEvents();
        }

        Arrow.prototype.bindEvents = function() {
            var inst = this;
            inst.canvas.on('mouse:down', function(o) {
                inst.onMouseDown(o);
            });
            inst.canvas.on('mouse:move', function(o) {
                inst.onMouseMove(o);
            });
            inst.canvas.on('mouse:up', function(o) {
                inst.onMouseUp(o);
            });
            inst.canvas.on('object:moving', function(o) {
                inst.disable();
            })
        }

        Arrow.prototype.onMouseUp = function(o) {
            var inst = this;
            inst.disable();
        };

        Arrow.prototype.onMouseMove = function(o) {
            var inst = this;
            if (!inst.isEnable()) {
                return;
            }

            var pointer = inst.canvas.getPointer(o.e);
            var activeObj = inst.canvas.getActiveObject();
            activeObj.set({
                x2: pointer.x,
                y2: pointer.y
            });
            activeObj.setCoords();
            inst.canvas.renderAll();
        };

        Arrow.prototype.onMouseDown = function(o) {
            var inst = this;
            inst.enable();
            var pointer = inst.canvas.getPointer(o.e);

            var points = [pointer.x, pointer.y, pointer.x, pointer.y];
            var line = new fabric.LineArrow(points, {
                strokeWidth: 5,
                fill: 'red',
                stroke: 'red',
                originX: 'center',
                originY: 'center',
                hasBorders: false,
                hasControls: false
            });

            inst.canvas.add(line).setActiveObject(line);
        };

        Arrow.prototype.isEnable = function() {
            if (this.canvas.isDrawingMode) return false;
            else return this.isDrawing;
        };

        Arrow.prototype.enable = function() {
            this.isDrawing = true;
        };

        Arrow.prototype.disable = function() {
            this.isDrawing = false;
        };

        return Arrow;
    }());*/

});
