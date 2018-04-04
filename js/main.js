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

    let drawingColor = $('#drawing-color'),
        drawingLineWidth = $('#drawing-line-width');

    currentEditorValue.child("content").once("value", function (data) {

        canvas = new fabric.Canvas('c', {
            isDrawingMode: true,
            selection: false
        });


        let c = new Circle(canvas);
        let a = new Arrow(canvas);

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
           c.desactive();
           a.desactive();
        });

        $("#circle-drawing").on('click', function () {
           canvas.isDrawingMode = false;
           c.active();
           a.desactive();
        });

        $("#arrow-drawing").on('click', function () {
           canvas.isDrawingMode = false;
           a.active();
           c.desactive();
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

        canvas.on("path:created", function(data) {

            if (syncing) {
                return;
            }

            currentEditorValue.update({
                content: JSON.stringify(canvas)
            });

            console.log(JSON.stringify(data.path));

            queueRef.push().set({
                event: JSON.stringify(data.path),
                by: uID,
                time: Date.now().toString()
            });
        });

        canvas.on("object:finish", function(data) {

            if (syncing) {
                return;
            }

            currentEditorValue.update({
                content: JSON.stringify(canvas)
            });

            console.log(JSON.stringify(data.target));

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


    var Circle = (function() {
        function Circle(canvas) {
            this.canvas = canvas;
            this.className = 'Circle';
            this.isDrawing = false;
            this.isActive = false;
            this.bindEvents();
        }

        let origX, origY;

        Circle.prototype.bindEvents = function() {
            let inst = this;
            inst.canvas.on('mouse:down', function(event) {
                if (inst.isActive) inst.onMouseDown(event);
            });
            inst.canvas.on('mouse:move', function(event) {
                if (inst.isActive) inst.onMouseMove(event);
            });
            inst.canvas.on('mouse:up', function(event) {
                if (inst.isActive) inst.onMouseUp(event);
            });
            inst.canvas.on('object:moving', function() {
                if (inst.isActive) inst.disable();
            })
        };

        Circle.prototype.onMouseUp = function() {
            let inst = this;
            if (inst.isEnable()) canvas.fire('object:finish', { target: inst.canvas.getActiveObject() });
            inst.disable();
        };

        Circle.prototype.onMouseMove = function(event) {
            let inst = this;
            if (!inst.isEnable()) {
                return;
            }

            let pointer = inst.canvas.getPointer(event.e);
            let activeObj = inst.canvas.getActiveObject();

            if (origX > pointer.x) {
                activeObj.set({ left: Math.abs(pointer.x) });
            }

            if (origY > pointer.y) {
                activeObj.set({ top: Math.abs(pointer.y) });
            }

            activeObj.set({
                rx: Math.abs(origX - pointer.x) / 2,
                ry: Math.abs(origY - pointer.y) / 2,
                width: Math.abs(origX - pointer.x),
                height: Math.abs(origY - pointer.y)
            });

            activeObj.setCoords();
            inst.canvas.renderAll();
        };

        Circle.prototype.onMouseDown = function(event) {
            let inst = this;
            inst.enable();

            let pointer = inst.canvas.getPointer(event.e);
            origX = pointer.x;
            origY = pointer.y;

            let ellipse = new fabric.Ellipse({
                top: origY,
                left: origX,
                originX: 'left',
                originY: 'top',
                width: pointer.x - origX,
                height: pointer.y - origY,
                rx: 0,
                ry: 0,
                transparentCorners: true,
                hasBorders: false,
                hasControls: false,
                stroke: drawingColor.val(),
                strokeWidth: parseInt(drawingLineWidth.val()),
                fill: 'rgba(0,0,0,0)'
            });

            inst.canvas.add(ellipse).setActiveObject(ellipse)
        };

        Circle.prototype.isEnable = function() {
            return this.isDrawing;
        };

        Circle.prototype.enable = function() {
            this.isDrawing = true;
        };

        Circle.prototype.disable = function() {
            this.isDrawing = false;
        };

        Circle.prototype.active = function () {
            this.isActive = true;
        };

        Circle.prototype.desactive = function () {
            this.isActive = false;
        };

        return Circle;
    }());

    var Arrow = (function() {
        function Arrow(canvas) {
            this.canvas = canvas;
            this.className = 'Arrow';
            this.isDrawing = false;
            this.isActive = false;
            this.bindEvents();
        }

        Arrow.prototype.bindEvents = function() {
            let inst = this;
            inst.canvas.on('mouse:down', function(o) {
                if (inst.isActive) inst.onMouseDown(o);
            });
            inst.canvas.on('mouse:move', function(o) {
                if (inst.isActive) inst.onMouseMove(o);
            });
            inst.canvas.on('mouse:up', function(o) {
                if (inst.isActive) inst.onMouseUp(o);
            });
            inst.canvas.on('object:moving', function(o) {
                if (inst.isActive) inst.disable();
            })
        };

        Arrow.prototype.onMouseUp = function(o) {
            let inst = this;
            if (inst.isEnable()) canvas.fire('object:finish', { target: inst.canvas.getActiveObject() });
            inst.disable();
        };

        Arrow.prototype.onMouseMove = function(o) {
            let inst = this;
            if (!inst.isEnable()) {
                return;
            }

            let pointer = inst.canvas.getPointer(o.e);
            let activeObj = inst.canvas.getActiveObject();

            activeObj.set({
                x2: pointer.x,
                y2: pointer.y
            });

            activeObj.setCoords();
            inst.canvas.renderAll();
        };

        Arrow.prototype.onMouseDown = function(o) {
            let inst = this;
            inst.enable();

            let pointer = inst.canvas.getPointer(o.e);
            let points = [pointer.x, pointer.y, pointer.x, pointer.y];
            let line = new fabric.Arrow(points, {
                strokeWidth: parseInt(drawingLineWidth.val()),
                fill: drawingColor.val(),
                stroke: drawingColor.val(),
                originX: 'center',
                originY: 'center',
                hasBorders: false,
                hasControls: false
            });

            inst.canvas.add(line).setActiveObject(line);
        };

        Arrow.prototype.isEnable = function() {
            return this.isDrawing;
        };

        Arrow.prototype.enable = function() {
            this.isDrawing = true;
        };

        Arrow.prototype.disable = function() {
            this.isDrawing = false;
        };

        Arrow.prototype.active = function () {
            this.isActive = true;
        };

        Arrow.prototype.desactive = function () {
            this.isActive = false;
        };

        return Arrow;
    }());

});
