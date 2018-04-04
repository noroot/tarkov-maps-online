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

});
