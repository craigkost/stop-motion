(() => {
    const width = 640;
    let height = 0;

    let video = null;
    let lastPhoto = null;
    let photoList = null;

    function load() {
        video = document.getElementById("video");
        lastPhoto = document.getElementById("lastPhoto");
        photoList = document.getElementById("photoList");

        navigator.mediaDevices
            .getUserMedia({
                            video: {
                              facingMode: { exact: "environment" }
                            }
                          })
            .then((stream) => {
                video.srcObject = stream;
                video.play();
            })
            .catch((err) => {
                console.error(`An error occurred: ${err}`);
            });

        video.addEventListener(
            "canplay",
            (ev) => {
                height = video.videoHeight / (video.videoWidth / width);

                video.setAttribute("width", width);
                video.setAttribute("height", height);
                lastPhoto.setAttribute("width", width);
                lastPhoto.setAttribute("height", height);

                clearPhoto();
            }
        );

        document.getElementById("captureButton").addEventListener(
            "click",
            (ev) => {
                takePhoto();
                ev.preventDefault();
            }
        );

        document.getElementById("playAnimationButton").addEventListener(
            "click",
            (ev) => {
                generatePreview();
                ev.preventDefault();
            }
        );

        document.getElementById("resetButton").addEventListener(
            "click",
            (ev) => {
                clearPhoto();
                photoList.replaceChildren();
                document.getElementById('preview').setAttribute('src', '');
                ev.preventDefault();
            }
        );

        document.getElementById("undoButton").addEventListener(
            "click",
            (ev) => {
                if (!photoList.lastChild) {
                    return;
                }
                photoList.removeChild(photoList.lastChild);
                // repaint canvas with last child if any otherwise clearPhoto()
                if (photoList.lastChild) {
                    const lastPhotoContext = lastPhoto.getContext("2d");
                    lastPhotoContext.drawImage(photoList.lastChild, 0, 0);
                } else {
                    clearPhoto();
                }
                ev.preventDefault();
            }
        );

        clearPhoto();
    }

    function clearPhoto() {
        const context = lastPhoto.getContext("2d");
        context.fillStyle = "#CCC";
        context.fillRect(0, 0, lastPhoto.width, lastPhoto.height);
    }

    function copyCanvas(canvas) {
        const newCanvas = document.createElement("canvas");
        newCanvas.width = width;
        newCanvas.height = height;
        const newCanvasContext = newCanvas.getContext("2d");
        newCanvasContext.drawImage(canvas, 0, 0);
        return newCanvas;
    }

    function takePhoto() {
        const context = lastPhoto.getContext("2d");
        lastPhoto.width = width;
        lastPhoto.height = height;
        context.drawImage(video, 0, 0, width, height);

        photoList.appendChild(copyCanvas(lastPhoto));
    }

    function generatePreview() {
        if (!photoList.hasChildNodes()) {
            return;
        }

        const encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setFrameRate(5 /* FPS */);
        encoder.start();
        for (const photo of photoList.children) {
          encoder.addFrame(photo.getContext("2d"));
        }
        encoder.finish();

        document.getElementById('preview').setAttribute('src', 'data:image/gif;base64,'+btoa(encoder.stream().getData()));
    }

    window.addEventListener("load", load, false);
})();